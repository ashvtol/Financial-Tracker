# Data Persistence Documentation

## Overview

The Financial Tracker now **automatically persists all your data** to local files in the project. You no longer need to re-upload your CSV files every time you use the app!

## What Gets Saved

### ✅ Automatically Saved to Files

All of the following data is automatically saved to files in `src/models/`:

1. **Transactions** (`src/models/transactions.json`)
   - All uploaded bank statement data
   - Transaction categories (including your edits)
   - User assignments
   - Source file information
   - Refund/credit status

2. **AI Learning Model** (`src/models/ai-model.json`)
   - Merchant → Category mappings
   - Learned categorization patterns
   - Custom categories you create

3. **Custom Categories** (`src/models/ai-model.json`)
   - Any custom categories you add
   - Category hierarchies (Parent - Child)

## How It Works

### Automatic Save
- **When you upload CSV files**: Transactions are saved immediately
- **When you edit a category**: Changes are saved automatically
- **When you create a custom category**: Saved instantly
- **No manual save needed**: Everything happens in the background

### Automatic Load
- **On app startup**: All saved data is loaded automatically
- **You'll see a notification**: "Loaded X saved transactions"
- **No need to re-upload**: Your data is ready to use

## File Locations

```
src/models/
├── transactions.json      # All your transaction data
└── ai-model.json         # AI learning + custom categories
```

## API Endpoints

The Express server (running on port 3001) provides these endpoints:

### Transactions
- `GET /api/transactions` - Load saved transactions
- `POST /api/transactions` - Save transactions
- `DELETE /api/transactions` - Clear all saved transactions

### AI Model
- `GET /api/model` - Load AI model and custom categories
- `POST /api/model` - Save AI model and custom categories

## Using the App

### First Time Setup
1. Start both servers: `npm start` (or `npm run dev` + `npm run server`)
2. Upload your bank statement CSVs
3. Data is automatically saved

### Subsequent Usage
1. Start the servers: `npm start`
2. Data loads automatically
3. Continue where you left off!

### Clearing Data

**Clear All Data Button**:
- Clears in-memory data
- Deletes saved transaction file
- **Keeps** AI learning model and custom categories (so you don't lose your training)

**Reset AI Button** (in Insights tab):
- Clears AI learning model
- **Keeps** transactions and custom categories

## Benefits

✅ **No Re-uploading**: Upload your CSVs once, use forever
✅ **Category Edits Persist**: Your categorization work is saved
✅ **AI Learns Permanently**: Trained patterns are never lost
✅ **Custom Categories Saved**: Your category structure persists
✅ **Automatic Backup**: Data is in files, easy to backup
✅ **Version Control Friendly**: Files are in JSON format

## Data Safety

- **Local Storage**: All data stays on your machine
- **File-Based**: Easy to backup, copy, or version control
- **Human-Readable**: JSON format, easy to inspect
- **API Fallback**: If file operations fail, data remains in memory

## Advanced Usage

### Manual Backup
Simply copy the `src/models/` folder to backup your data:
```bash
cp -r src/models/ ~/backups/financial-tracker-$(date +%Y%m%d)/
```

### Sharing AI Model
Export your AI model via the "Export AI Model" button, then share the JSON file with others or use it on another machine.

### Git Ignore
The `src/models/*.json` files are in `.gitignore` to keep your private financial data out of version control.

## Troubleshooting

**Data Not Loading?**
- Make sure the API server is running: `npm run server`
- Check console for error messages
- Verify files exist in `src/models/`

**Server Not Starting?**
- Port 3001 might be in use
- Try: `pkill -f "node.*server.js"` then restart

**Data Not Saving?**
- Check server console for save confirmations
- Look for error messages in browser console
- Ensure `src/models/` directory exists and is writable
