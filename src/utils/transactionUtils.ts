export const extractMerchant = (description: string): string => {
  // Extract merchant name from transaction description
  const words = description.toLowerCase().split(/[\s\-#\*]+/);
  return words.slice(0, 2).join(' ').trim();
};

export const extractUserFromFile = (file: File): string => {
  // Try webkitRelativePath first (folder upload)
  if (file.webkitRelativePath) {
    const parts = file.webkitRelativePath.split('/');
    // Expected structure: Statments/UserName/BankName/file.csv
    // parts[0] = Statments, parts[1] = UserName, parts[2] = BankName, parts[3] = file.csv
    if (parts.length >= 2 && parts[1]) {
      return parts[1]; // Return the user folder name (e.g., "Ashish")
    }
  }

  // Fallback: try to extract from file name or path property
  const path = file.path || file.name || '';
  const pathParts = path.split('/');
  if (pathParts.length >= 2) {
    // Look for pattern: .../UserName/BankName/...
    const userIndex = pathParts.findIndex(p => p === 'Statments' || p === 'Statements');
    if (userIndex >= 0 && pathParts[userIndex + 1]) {
      return pathParts[userIndex + 1];
    }
  }

  return 'Unknown User';
};
