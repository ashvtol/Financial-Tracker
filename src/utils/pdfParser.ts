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

// Parse Citi Debit/Checking statement
const parseCitiDebitStatement = (text: string): PDFParseResult => {
  const transactions: ParsedTransaction[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);

  // Find statement period
  const periodMatch = text.match(/Period\s+(\w+\s+\d{1,2})\s*[-–]\s*(\w+\s+\d{1,2},?\s*\d{4})/i);
  const billingPeriod = periodMatch ? `${periodMatch[1]} - ${periodMatch[2]}` : undefined;

  // Get year from statement period
  let statementYear = new Date().getFullYear();
  if (periodMatch) {
    const yearMatch = periodMatch[2].match(/(\d{4})/);
    if (yearMatch) {
      statementYear = parseInt(yearMatch[1]);
    }
  }

  console.log('PDF Parser (Debit): Statement period:', billingPeriod, 'Year:', statementYear);

  // Log first 50 lines for debugging
  console.log('PDF Parser (Debit): First 50 lines:');
  for (let j = 0; j < Math.min(50, lines.length); j++) {
    console.log(`  [${j}]: ${lines[j]}`);
  }

  // Track if we're in the Checking Activity section
  let inCheckingActivity = false;

  // Pattern for debit transactions: Date Description Amount (with possible balance)
  // Format: "MM/DD Description $X,XXX.XX" or amounts without $ sign
  // The columns are: Date, Description, Amount Subtracted, Amount Added, Balance

  // Pattern to match date at start of line
  const datePattern = /^(\d{1,2}\/\d{1,2})\s+(.+)/;

  // Pattern to match amounts (with or without $ sign, with optional negative)
  const amountPattern = /(-?\$?[\d,]+\.\d{2})/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const normalizedLine = line.replace(/\s+/g, ' ').trim();

    // Detect Checking Activity section
    if (/checking\s*activity/i.test(normalizedLine)) {
      inCheckingActivity = true;
      console.log('PDF Parser (Debit): Entering Checking Activity section');
      continue;
    }

    // Detect end of Checking Activity (next major section)
    if (inCheckingActivity && /^(savings\s*activity|summary\s*of|account\s*summary)/i.test(normalizedLine)) {
      inCheckingActivity = false;
      console.log('PDF Parser (Debit): Exiting Checking Activity section');
      continue;
    }

    // Skip header rows
    if (/^date\s+description/i.test(normalizedLine) ||
        /amount\s*(subtracted|added)/i.test(normalizedLine) ||
        /^balance$/i.test(normalizedLine)) {
      continue;
    }

    if (!inCheckingActivity) continue;

    // Try to parse transaction line
    const dateMatch = line.match(datePattern);
    if (dateMatch) {
      const dateStr = dateMatch[1];
      const rest = dateMatch[2];

      // Extract all amounts from the line
      const amounts: number[] = [];
      let match;
      const restForAmounts = rest;
      const amountRegex = /(-?\$?[\d,]+\.\d{2})/g;
      while ((match = amountRegex.exec(restForAmounts)) !== null) {
        const amountStr = match[1].replace(/[$,]/g, '');
        amounts.push(parseFloat(amountStr));
      }

      if (amounts.length === 0) continue;

      // Extract description (everything before the first amount)
      const firstAmountMatch = rest.match(/(-?\$?[\d,]+\.\d{2})/);
      let description = firstAmountMatch
        ? rest.substring(0, firstAmountMatch.index).trim()
        : rest.trim();

      // Clean up description
      description = description.replace(/\s+/g, ' ').trim();
      if (!description || description.length < 2) continue;

      // Parse the date
      const [month, day] = dateStr.split('/').map(Number);
      const fullDate = `${statementYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      // Determine if this is income (amount added) or expense (amount subtracted)
      // In checking statements:
      // - If there are 3 amounts: [subtracted, added, balance]
      // - If there are 2 amounts: could be [subtracted, balance] or [added, balance]
      // - Usually, the structure shows the amount in the appropriate column

      // Heuristic: Look at the position of amounts in the line
      // Or check if description suggests income
      const incomeKeywords = /payroll|direct\s*dep|deposit|transfer\s*from|refund|interest|dividend/i;
      const isLikelyIncome = incomeKeywords.test(description);

      // Use the first non-zero amount as the transaction amount
      // For checking statements, we'll use position-based logic
      let amount = amounts[0];
      let isExpense = true;
      let isIncome = false;

      // If we have multiple amounts, try to determine which is subtracted vs added
      if (amounts.length >= 2) {
        // Usually format is: [subtracted] [added] [balance]
        // If first amount is 0 or missing, second is the added amount
        if (amounts[0] === 0 && amounts[1] > 0) {
          amount = amounts[1];
          isExpense = false;
          isIncome = true;
        } else if (amounts[0] > 0) {
          amount = amounts[0];
          isExpense = true;
          isIncome = false;
        }
      } else if (isLikelyIncome) {
        isExpense = false;
        isIncome = true;
      }

      console.log(`PDF Parser (Debit): Transaction: ${fullDate} | ${description.substring(0, 30)}... | $${amount} | ${isIncome ? 'INCOME' : 'EXPENSE'}`);

      transactions.push({
        date: fullDate,
        description,
        amount: Math.abs(amount),
        isExpense,
        isIncome
      });
    }
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

// Detect statement type and parse accordingly
const detectAndParseStatement = (text: string): PDFParseResult => {
  const textLower = text.toLowerCase();

  // Check for Citi Debit/Checking statement first (more specific)
  if ((textLower.includes('citi') || textLower.includes('citibank')) &&
      (textLower.includes('checking activity') || textLower.includes('deposit accounts') || textLower.includes('checking account'))) {
    console.log('PDF Parser: Detected Citi Debit/Checking statement');
    return parseCitiDebitStatement(text);
  }

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

  // Extract text from all pages
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n';
  }

  // Also try line-by-line extraction for better structure
  let structuredText = '';
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    // Group by Y position to reconstruct lines
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
        structuredText += lineText + '\n';
      }
    });
  }

  // Use structured text for parsing
  return detectAndParseStatement(structuredText);
};

export const isPDFFile = (file: File): boolean => {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
};
