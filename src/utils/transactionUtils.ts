export const extractMerchant = (description: string): string => {
  // Extract merchant name from transaction description
  const words = description.toLowerCase().split(/[\s\-#\*]+/);
  return words.slice(0, 2).join(' ').trim();
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

    // Otherwise assume structure: UserName/BankName/file.csv
    // parts[0] = UserName, parts[1] = BankName, parts[2] = file.csv
    if (parts.length >= 3 && parts[0]) {
      return parts[0]; // Return the user folder name (e.g., "Ashish")
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
