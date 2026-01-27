import * as pdfjsLib from 'pdfjs-dist';

// Use local worker file to avoid CORS issues
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';

console.log('PDF.js version:', pdfjsLib.version);

interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  isExpense: boolean;  // true for purchases/withdrawals, false for payments/credits/deposits
  isIncome?: boolean;  // true for income/deposits (from checking/debit statements)
}

interface PDFParseResult {
  transactions: ParsedTransaction[];
  statementType: string;
  billingPeriod?: string;
}

// Parse Citi credit card statement
const parseCitiStatement = (text: string): PDFParseResult => {
  const transactions: ParsedTransaction[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);

  // Find billing period
  const billingMatch = text.match(/Billing Period[:\s]*(\d{1,2}\/\d{1,2}\/\d{2,4})\s*[-–]\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i);
  const billingPeriod = billingMatch ? `${billingMatch[1]} - ${billingMatch[2]}` : undefined;

  // Get the year from billing period or current year
  let statementYear = new Date().getFullYear();
  let statementEndMonth = 12;
  if (billingMatch) {
    const yearMatch = billingMatch[2].match(/(\d{2,4})$/);
    if (yearMatch) {
      const year = yearMatch[1];
      statementYear = year.length === 2 ? 2000 + parseInt(year) : parseInt(year);
    }
    // Get end month to determine year for transactions
    const endMonthMatch = billingMatch[2].match(/^(\d{1,2})\//);
    if (endMonthMatch) {
      statementEndMonth = parseInt(endMonthMatch[1]);
    }
  }

  // Skip patterns - lines that are not transactions
  const skipPatterns = [
    /^Page \d/i,
    /www\.citicards\.com/i,
    /Customer Service/i,
    /Account Summary/i,
    /Interest Charge/i,
    /Annual percentage/i,
    /APR/,
    /Rewards/i,
    /^TOTAL/i,
    /Fees Charged/i,
    /Interest Charged/i,
    /Credit Limit/i,
    /CARDHOLDER/i,
    /Card ending/i,
    /New Charges/i,
    /Standard Purchases/i,
    /Payments, Credits/i,
    /Sale\s+Post/i,
    /Date\s+Date/i,
    /Description\s+Amount/i,
    /^\d{4} totals/i,
    /Balance type/i,
    /Balance subject/i,
    /PURCHASES$/,
    /ADVANCES$/,
    /^\(TTY/,
    /Important:/i,
    /©\d{4}/,
    /Citi,? Citi/i,
    /Visa is a registered/i,
    /Visit Citi\.com/i,
    /PHONE NUMBER/i,
    /FOLIO NUMBER/i,
    /ARRIVE:/i,
    /DEPART:/i
  ];

  const shouldSkip = (line: string): boolean => {
    return skipPatterns.some(pattern => pattern.test(line));
  };

  // Section detection patterns - handle extra spaces from PDF extraction
  const paymentsSection = /Payments,?\s*Credits\s*(and|&)?\s*Adjustments/i;
  const paymentsSectionAlt = /Payments,?\s+Credits/i; // Partial match for section header
  const purchasesSection = /Standard\s*Purchases/i;
  const feesSection = /Fees\s*Charged/i;
  const interestSection = /Interest\s*Charged/i;

  // Payment/Credit transaction indicators (used as fallback when section detection fails)
  const paymentIndicators = [
    /PAYMENT\s*-?\s*THANK\s*YOU/i,  // Matches "PAYMENT THANK YOU", "PAYMENT - THANK YOU", etc.
    /PAYMENT\s+THANK\s+YOU/i,        // Matches "PAYMENT THANK YOU -" format
    /^AUTOPAY\s+PAYMENT/i,
    /^ONLINE\s+PAYMENT/i,
    /^PAYMENT\s+RECEIVED/i,
    /^CREDIT\s+ADJUSTMENT/i,
    /^REFUND/i,
    /^CREDIT\s+MEMO/i,
    /^RETURNED\s+PAYMENT/i,
    /PAYMENT\s*-\s*THANK/i,
    /^PAYMENT\s+/i,                  // Any description starting with "PAYMENT "
  ];

  // Transaction patterns
  // Pattern 1: "MM/DD MM/DD DESCRIPTION $AMOUNT" or "MM/DD DESCRIPTION $AMOUNT"
  const transactionWithAmount = /^(\d{1,2}\/\d{1,2})(?:\s+(\d{1,2}\/\d{1,2}))?\s+(.+?)\s+(-?\$[\d,]+\.\d{2})$/;

  // Pattern 2: Just amount on a line
  const amountOnly = /^(-?\$[\d,]+\.\d{2})$/;

  // Pattern 3: Date and description without amount (amount might be on next line)
  const dateAndDesc = /^(\d{1,2}\/\d{1,2})(?:\s+(\d{1,2}\/\d{1,2}))?\s+(.+)$/;

  // Helper to determine year based on month
  const getYearForMonth = (month: number): number => {
    // If statement ends in Jan and transaction is in Dec, it's previous year
    if (statementEndMonth <= 2 && month >= 11) {
      return statementYear - 1;
    }
    return statementYear;
  };

  let pendingTransaction: { date: string; description: string; isExpense: boolean } | null = null;

  // Track which section we're in: 'payments' = not expense, 'purchases' = expense
  let currentSection: 'payments' | 'purchases' | 'fees' | 'interest' | 'unknown' = 'unknown';

  // Log a sample of lines to understand PDF structure
  console.log('PDF Parser: First 50 lines of extracted text:');
  for (let j = 0; j < Math.min(50, lines.length); j++) {
    console.log(`  [${j}]: ${lines[j]}`);
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for section headers (handle extra spaces from PDF extraction)
    const normalizedLine = line.replace(/\s+/g, ' ').trim();

    if (paymentsSection.test(normalizedLine) || paymentsSectionAlt.test(normalizedLine)) {
      currentSection = 'payments';
      console.log('PDF Parser: Entering Payments/Credits section at line:', line);
      continue;
    }
    if (purchasesSection.test(normalizedLine)) {
      currentSection = 'purchases';
      console.log('PDF Parser: Entering Standard Purchases section at line:', line);
      continue;
    }
    if (feesSection.test(normalizedLine)) {
      currentSection = 'fees';
      console.log('PDF Parser: Entering Fees section at line:', line);
      continue;
    }
    if (interestSection.test(normalizedLine)) {
      currentSection = 'interest';
      console.log('PDF Parser: Entering Interest section at line:', line);
      continue;
    }

    // Skip empty or known non-transaction lines
    if (!line || shouldSkip(line)) {
      continue;
    }

    // Helper to check if description indicates a payment/credit
    const isPaymentByDescription = (desc: string): boolean => {
      const normalizedDesc = desc.replace(/\s+/g, ' ').trim();
      return paymentIndicators.some(pattern => pattern.test(normalizedDesc));
    };

    // Determine if this is an expense based on section
    // Default to purchases (expense) if section is unknown, but check description for payment indicators
    let isExpenseSection = currentSection === 'purchases' || currentSection === 'fees' || currentSection === 'interest';
    if (currentSection === 'unknown') {
      // Unknown section - will check description later for each transaction
      isExpenseSection = true; // Default to expense, but will override below if description indicates payment
    }

    // If we have a pending transaction and this line is just an amount
    if (pendingTransaction) {
      const amountMatch = line.match(amountOnly);
      if (amountMatch) {
        const amountStr = amountMatch[1].replace(/[$,]/g, '');
        const amount = parseFloat(amountStr);
        transactions.push({
          date: pendingTransaction.date,
          description: pendingTransaction.description,
          amount: Math.abs(amount),
          isExpense: pendingTransaction.isExpense
        });
        pendingTransaction = null;
        continue;
      }
      // Not an amount, clear pending and continue processing this line
      pendingTransaction = null;
    }

    // Try to match full transaction with amount
    const fullMatch = line.match(transactionWithAmount);
    if (fullMatch) {
      const postDate = fullMatch[2] || fullMatch[1];
      const description = fullMatch[3].trim();
      const amountStr = fullMatch[4].replace(/[$,]/g, '');
      const amount = parseFloat(amountStr);

      const [month, day] = postDate.split('/').map(Number);
      const year = getYearForMonth(month);
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      // Determine isExpense: false if in payments section OR description indicates payment/credit
      const isExpense = currentSection === 'payments' ? false :
                       (isExpenseSection && !isPaymentByDescription(description));

      console.log(`PDF Parser: Transaction in section '${currentSection}': ${description.substring(0, 30)}... isExpense=${isExpense}`);

      transactions.push({
        date: dateStr,
        description,
        amount: Math.abs(amount),
        isExpense
      });
      continue;
    }

    // Try to match date and description (amount might be on next line)
    const dateDescMatch = line.match(dateAndDesc);
    if (dateDescMatch) {
      const postDate = dateDescMatch[2] || dateDescMatch[1];
      let description = dateDescMatch[3].trim();

      // Check if next line has the amount
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        const nextAmountMatch = nextLine.match(amountOnly);
        if (nextAmountMatch) {
          const amountStr = nextAmountMatch[1].replace(/[$,]/g, '');
          const amount = parseFloat(amountStr);

          const [month, day] = postDate.split('/').map(Number);
          const year = getYearForMonth(month);
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

          // Determine isExpense: false if in payments section OR description indicates payment/credit
          const isExpense = currentSection === 'payments' ? false :
                           (isExpenseSection && !isPaymentByDescription(description));

          transactions.push({
            date: dateStr,
            description,
            amount: Math.abs(amount),
            isExpense
          });
          i++; // Skip the amount line
          continue;
        }
      }

      // Store as pending in case amount comes later
      const [month, day] = postDate.split('/').map(Number);
      const year = getYearForMonth(month);
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      // Determine isExpense: false if in payments section OR description indicates payment/credit
      const isExpense = currentSection === 'payments' ? false :
                       (isExpenseSection && !isPaymentByDescription(description));

      pendingTransaction = { date: dateStr, description, isExpense };
    }
  }

  console.log(`PDF Parser: Found ${transactions.length} transactions (${transactions.filter(t => t.isExpense).length} expenses, ${transactions.filter(t => !t.isExpense).length} credits/payments)`);

  return {
    transactions,
    statementType: 'Citi',
    billingPeriod
  };
};

// Parse Citi Debit/Checking statement with position-based column detection
interface LineWithPositions {
  y: number;
  items: Array<{ str: string; x: number }>;
  text: string;
}

const parseCitiDebitStatementWithPositions = (
  linesWithPositions: LineWithPositions[],
  text: string
): PDFParseResult => {
  const transactions: ParsedTransaction[] = [];

  // Find statement period from text
  const periodMatch = text.match(/Period\s+(\w+\s+\d{1,2})\s*[-–]\s*(\w+\s+\d{1,2},?\s*\d{4})/i);
  const billingPeriod = periodMatch ? `${periodMatch[1]} - ${periodMatch[2]}` : undefined;

  // Get year from statement period and detect if it spans two years
  let statementEndYear = new Date().getFullYear();
  let statementStartMonth = '';
  let statementEndMonth = '';

  if (periodMatch) {
    const yearMatch = periodMatch[2].match(/(\d{4})/);
    if (yearMatch) {
      statementEndYear = parseInt(yearMatch[1]);
    }
    // Extract start and end months
    const startMonthMatch = periodMatch[1].match(/^(\w+)/);
    const endMonthMatch = periodMatch[2].match(/^(\w+)/);
    if (startMonthMatch) statementStartMonth = startMonthMatch[1].toLowerCase();
    if (endMonthMatch) statementEndMonth = endMonthMatch[1].toLowerCase();
  }

  // Check if statement spans two years (e.g., Dec - Jan)
  const monthOrder = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const startMonthIndex = monthOrder.findIndex(m => statementStartMonth.startsWith(m));
  const endMonthIndex = monthOrder.findIndex(m => statementEndMonth.startsWith(m));
  const spansYears = startMonthIndex > endMonthIndex; // e.g., Dec (11) > Jan (0)

  console.log('PDF Parser (Debit): Statement period:', billingPeriod, 'End Year:', statementEndYear, 'Spans years:', spansYears);

  let inCheckingActivity = false;

  // First pass: identify transaction start lines and their indices
  const transactionStarts: Array<{ index: number; dateStr: string }> = [];

  for (let i = 0; i < linesWithPositions.length; i++) {
    const { text: lineText } = linesWithPositions[i];

    // Detect Checking Activity section
    if (/checking\s*activity/i.test(lineText)) {
      inCheckingActivity = true;
      console.log('PDF Parser (Debit): Entering Checking Activity section');
      continue;
    }

    // Detect end of Checking Activity
    if (inCheckingActivity && /^(savings|summary)/i.test(lineText)) {
      inCheckingActivity = false;
      console.log('PDF Parser (Debit): Exiting Checking Activity section');
      break;
    }

    if (!inCheckingActivity) continue;

    // Check if this is a transaction start line (has date)
    const dateMatch = lineText.match(/^(\d{1,2}\/\d{1,2})/);
    if (dateMatch) {
      transactionStarts.push({ index: i, dateStr: dateMatch[1] });
    }
  }

  // Boilerplate text patterns to ignore (not part of transaction description)
  const boilerplatePatterns = [
    /statement\s*period/i, /account\s*\d+/i, /customer\s*service/i,
    /www\./i, /http/i, /you\s*can\s*call/i, /telephone/i, /tty/i,
    /monthly\s*service\s*fee/i, /atm\s*fee/i, /relationship\s*tier/i,
    /total\s*(subtracted|added)/i, /citi\s*priority/i
  ];

  const isBoilerplate = (text: string): boolean => {
    return boilerplatePatterns.some(pattern => pattern.test(text));
  };

  // Second pass: process each transaction with its continuation lines
  for (let t = 0; t < transactionStarts.length; t++) {
    const { index: startIdx, dateStr } = transactionStarts[t];
    const nextStartIdx = t < transactionStarts.length - 1 ? transactionStarts[t + 1].index : linesWithPositions.length;

    // Parse using X positions - columns may vary by PDF
    // Amount Subtracted: typically x ~ 340-430
    // Amount Added: typically x ~ 430-520
    // Balance: typically x ~ 520+
    let amountSubtracted = 0;
    let amountAdded = 0;
    let description = '';

    // Collect all amounts with their positions for smarter detection
    const amounts: Array<{ amount: number; x: number }> = [];

    // Process transaction start line and at most 1 continuation line
    const maxLines = Math.min(startIdx + 2, nextStartIdx); // Start line + 1 continuation max
    for (let lineIdx = startIdx; lineIdx < maxLines; lineIdx++) {
      const { items, text: lineText } = linesWithPositions[lineIdx];

      // Stop if we hit boilerplate text
      if (isBoilerplate(lineText)) break;

      for (const item of items) {
        const x = item.x;
        const itemText = item.str.trim();

        // Skip boilerplate text items
        if (isBoilerplate(itemText)) continue;

        // Check if it's a number (amount)
        const numMatch = itemText.match(/^([\d,]+\.\d{2})$/);

        if (numMatch) {
          const amount = parseFloat(numMatch[1].replace(/,/g, ''));
          amounts.push({ amount, x });
        } else if (x >= 70 && x < 350 && itemText.length > 0 && !/^\d{1,2}\/\d{1,2}$/.test(itemText)) {
          description += itemText + ' ';
        }
      }
    }

    // Sort amounts by X position and assign to columns
    // Typically: subtracted (left), added (middle), balance (right)
    amounts.sort((a, b) => a.x - b.x);
    if (amounts.length >= 2) {
      // If we have 2+ amounts, first non-balance is subtracted, second is added
      // Balance is usually the largest X position
      if (amounts.length === 2) {
        // Could be subtracted+balance or added+balance
        // Use X position to determine: if first is < 430, it's subtracted; otherwise added
        if (amounts[0].x < 430) {
          amountSubtracted = amounts[0].amount;
        } else {
          amountAdded = amounts[0].amount;
        }
      } else if (amounts.length >= 3) {
        amountSubtracted = amounts[0].amount;
        amountAdded = amounts[1].amount;
        // amounts[2] is balance, ignore
      }
    } else if (amounts.length === 1) {
      // Single amount - use X position to determine type
      if (amounts[0].x < 430) {
        amountSubtracted = amounts[0].amount;
      } else if (amounts[0].x < 520) {
        amountAdded = amounts[0].amount;
      }
      // If x >= 520, it's just a balance line, ignore
    }

    description = description.trim();
    if (!description) continue;

    // Debug: log what we found
    if (amounts.length > 0) {
      console.log(`PDF Parser (Debit): Line "${dateStr}" amounts:`, amounts.map(a => `$${a.amount}@x=${a.x.toFixed(0)}`).join(', '), `| desc: ${description.substring(0, 30)}`);
    }

    // Parse the date with correct year handling for statements spanning two years
    const [month, day] = dateStr.split('/').map(Number);
    // If statement spans years (e.g., Dec-Jan) and this is a late-year month, use previous year
    let transactionYear = statementEndYear;
    if (spansYears && month >= 10) { // Oct, Nov, Dec should be previous year
      transactionYear = statementEndYear - 1;
    }
    const fullDate = `${transactionYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const descLower = description.toLowerCase();

    // Check if this is a credit card payment (not an expenditure)
    const isCreditCardPayment = /american\s*expr|amex|citi\s*autopay|bankcard|credit\s*card\s*payment/i.test(description);

    // Check if this is a payroll/salary deposit
    const isSalary = /payroll|salary|direct\s*dep.*(?:employer|company)|oracle.*payroll/i.test(description);

    let amount: number;
    let isExpense: boolean;
    let isIncome: boolean;
    let isPayment: boolean = false;

    if (amountAdded > 0) {
      amount = amountAdded;
      isExpense = false;
      isIncome = true;
    } else if (amountSubtracted > 0) {
      amount = amountSubtracted;

      // Credit card payments are not expenditures
      if (isCreditCardPayment) {
        isExpense = false;
        isIncome = false;
        isPayment = true;
      } else {
        isExpense = true;
        isIncome = false;
      }
    } else {
      continue;
    }

    // Determine transaction type for logging
    let txType = 'EXPENSE';
    if (isIncome) txType = isSalary ? 'INCOME-SALARY' : 'INCOME';
    else if (isPayment) txType = 'PAYMENT';

    console.log(`PDF Parser (Debit): ${fullDate} | ${txType} | $${amount} | ${description.substring(0, 40)}`);

    transactions.push({
      date: fullDate,
      description,
      amount,
      isExpense,
      isIncome,
      // Pass salary flag through description check in FinancialTracker
    });
  }

  console.log(`PDF Parser (Debit): Found ${transactions.length} transactions (${transactions.filter(t => t.isExpense).length} expenses, ${transactions.filter(t => t.isIncome).length} income)`);

  return {
    transactions,
    statementType: 'Citi Debit',
    billingPeriod
  };
};

// Parse American Express statement (existing CSV format works, this is for future PDF support)
const parseAmexStatement = (text: string): PDFParseResult => {
  // Amex PDF parsing logic would go here
  return {
    transactions: [],
    statementType: 'Amex'
  };
};

// Detect statement type and parse accordingly (for non-debit statements)
const detectAndParseStatement = (text: string): PDFParseResult => {
  const textLower = text.toLowerCase();

  // Citi credit card statement
  if (textLower.includes('citi') || textLower.includes('costco anywhere visa')) {
    console.log('PDF Parser: Detected Citi Credit Card statement');
    return parseCitiStatement(text);
  }

  if (textLower.includes('american express') || textLower.includes('amex')) {
    return parseAmexStatement(text);
  }

  // Default to Citi parser as fallback
  return parseCitiStatement(text);
};

// Main function to parse PDF file
export const parsePDFStatement = async (file: File): Promise<PDFParseResult> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';
  const allLinesWithPositions: LineWithPositions[] = [];

  // Extract text from all pages with position information
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    // Build full text
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n';

    // Group by Y position to reconstruct lines with position data
    const items = textContent.items as any[];
    const lineMap = new Map<number, any[]>();

    items.forEach(item => {
      const y = Math.round(item.transform[5]); // Y position
      if (!lineMap.has(y)) {
        lineMap.set(y, []);
      }
      lineMap.get(y)!.push(item);
    });

    // Sort lines by Y (descending for top-to-bottom)
    const sortedLines = Array.from(lineMap.entries())
      .sort((a, b) => b[0] - a[0]);

    sortedLines.forEach(([y, lineItems]) => {
      // Sort items by X position (left to right)
      lineItems.sort((a, b) => a.transform[4] - b.transform[4]);
      const lineText = lineItems.map(item => item.str).join(' ').trim();
      if (lineText) {
        allLinesWithPositions.push({
          y,
          items: lineItems.map(item => ({
            str: item.str,
            x: Math.round(item.transform[4])
          })),
          text: lineText
        });
      }
    });
  }

  // Build structured text for other parsers
  const structuredText = allLinesWithPositions.map(l => l.text).join('\n');

  // Check if this is a Citi Debit/Checking statement (needs position-based parsing)
  const textLower = fullText.toLowerCase();
  if ((textLower.includes('citi') || textLower.includes('citibank')) &&
      (textLower.includes('checking activity') || textLower.includes('deposit accounts'))) {
    console.log('PDF Parser: Detected Citi Debit/Checking statement (using position-based parsing)');
    return parseCitiDebitStatementWithPositions(allLinesWithPositions, fullText);
  }

  // Use text-based parsing for other statement types
  return detectAndParseStatement(structuredText);
};

export const isPDFFile = (file: File): boolean => {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
};
