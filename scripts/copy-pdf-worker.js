const fs = require('fs');
const path = require('path');

// Verify pdfjs-dist is installed with the worker file
const workerPath = path.join(__dirname, '..', 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.mjs');

if (fs.existsSync(workerPath)) {
  console.log('✓ PDF.js worker file found - PDF parsing will work correctly');
} else {
  console.warn('⚠ Warning: pdfjs-dist worker not found at:', workerPath);
  console.warn('  PDF parsing will not work. Try reinstalling: npm install pdfjs-dist');
}
