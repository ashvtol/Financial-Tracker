export const extractMerchant = (description: string): string => {
  // Extract merchant name from transaction description
  const words = description.toLowerCase().split(/[\s\-#\*]+/);
  return words.slice(0, 2).join(' ').trim();
};

// Calculate similarity between two strings (0-1, where 1 is exact match)
const calculateSimilarity = (str1: string, str2: string): number => {
  if (str1 === str2) return 1;
  if (str1.length === 0 || str2.length === 0) return 0;

  // Check if one contains the other
  if (str1.includes(str2) || str2.includes(str1)) return 0.9;

  // Check if first words match
  const words1 = str1.split(' ');
  const words2 = str2.split(' ');
  if (words1[0] === words2[0] && words1[0].length >= 3) return 0.8;

  // Levenshtein distance for fuzzy matching
  const matrix: number[][] = [];
  for (let i = 0; i <= str1.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str2.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= str1.length; i++) {
    for (let j = 1; j <= str2.length; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  const distance = matrix[str1.length][str2.length];
  const maxLen = Math.max(str1.length, str2.length);
  return 1 - distance / maxLen;
};

// Find best matching merchant from learning model using fuzzy matching
export const findMatchingMerchant = (
  merchant: string,
  learningModel: Map<string, string>,
  threshold: number = 0.7
): { key: string; category: string } | null => {
  // First try exact match
  if (learningModel.has(merchant)) {
    return { key: merchant, category: learningModel.get(merchant)! };
  }

  // Fuzzy match - find best match above threshold
  let bestMatch: { key: string; category: string; score: number } | null = null;

  for (const [key, category] of learningModel.entries()) {
    const score = calculateSimilarity(merchant, key);
    if (score >= threshold && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { key, category, score };
    }
  }

  if (bestMatch) {
    console.log(`Fuzzy match: "${merchant}" matched "${bestMatch.key}" (score: ${bestMatch.score.toFixed(2)}) -> ${bestMatch.category}`);
    return { key: bestMatch.key, category: bestMatch.category };
  }

  return null;
};

// Common bank/financial institution patterns
const BANK_PATTERNS = [
  'citi', 'chase', 'amex', 'american-express', 'americanexpress',
  'wells', 'fargo', 'wellsfargo', 'bank', 'capital', 'capitalone',
  'discover', 'usbank', 'pnc', 'td', 'barclays', 'hsbc', 'costco',
  'amazon', 'apple', 'synchrony', 'credit', 'visa', 'mastercard'
];

const isBankFolderName = (name: string): boolean => {
  const lower = name.toLowerCase().replace(/[^a-z]/g, '');
  return BANK_PATTERNS.some(pattern => lower.includes(pattern));
};

export const extractUserFromFile = (file: File): string => {
  // Try webkitRelativePath first (folder upload)
  if (file.webkitRelativePath) {
    const parts = file.webkitRelativePath.split('/');

    // Check if first folder is "Statements" or "Statments"
    // Structure: Statements/UserName/BankName/file.csv
    if (parts.length >= 4 && (parts[0] === 'Statements' || parts[0] === 'Statments')) {
      return parts[1]; // Return UserName
    }

    // Structure: UserName/BankName/file.csv (3 parts)
    if (parts.length >= 3 && parts[0]) {
      return parts[0]; // Return the user folder name (e.g., "Ashish")
    }

    // Structure: BankName/file.csv (2 parts) - user selected bank folder directly
    // Check if parts[0] looks like a bank name vs user name
    if (parts.length === 2 && parts[0]) {
      if (!isBankFolderName(parts[0])) {
        // Doesn't look like a bank, might be a user name
        return parts[0];
      }
      // It's a bank folder - can't determine user
      console.warn(`Cannot determine user from path "${file.webkitRelativePath}". Please select the parent folder containing user folders (e.g., Statements or Ashish).`);
    }
  }

  // Fallback: try to extract from file name or path property
  const path = (file as any).path || file.name || '';
  const pathParts = path.split('/');
  if (pathParts.length >= 2) {
    // Look for pattern: .../Statements/UserName/BankName/...
    const userIndex = pathParts.findIndex((p: string) => p === 'Statments' || p === 'Statements');
    if (userIndex >= 0 && pathParts[userIndex + 1]) {
      return pathParts[userIndex + 1];
    }
    // Otherwise assume last 3 parts are UserName/BankName/file.csv
    if (pathParts.length >= 3) {
      return pathParts[pathParts.length - 3];
    }
  }

  return 'Unknown User';
};
