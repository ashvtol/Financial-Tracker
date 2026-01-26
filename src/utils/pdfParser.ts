import * as pdfjsLib from 'pdfjs-dist';

// Use local worker file to avoid CORS issues
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';

console.log('PDF.js version:', pdfjsLib.version);

interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  isExpense: boolean;  // true for purchases, false for payments/credits/adjustments
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

  if (textLower.includes('citi') || textLower.includes('costco anywhere visa')) {
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
