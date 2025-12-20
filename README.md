# Advanced Financial Tracker

An AI-powered financial tracking application with smart categorization, user management, and comprehensive analytics.

**Author:** Ashish Kumar ([@ashvtol](https://github.com/ashvtol))

## Features

- **Multi-User Support**: Upload folder structures to automatically organize transactions by user
- **AI-Powered Categorization**: Smart transaction categorization with learning capabilities
- **Persistent AI Model Storage**: AI learning model automatically saved to `src/models/ai-model.json`
- **Refund Matching**: Automatically matches charges with refunds to show net spending
- **Custom Categories**: Create and manage your own spending categories
- **Interactive Visualizations**: Charts and graphs for spending analysis
- **Data Export/Import**: Export and import AI learning models as JSON files
- **Combined & Individual Views**: View data for individual users or all users combined

## Project Structure

```
Financial-Tracker/
├── src/
│   ├── components/
│   │   └── FinancialTracker.tsx    # Main application component
│   ├── constants/
│   │   ├── categories.ts           # Default spending categories
│   │   └── config.ts               # Application configuration
│   ├── models/
│   │   ├── ai-model.json           # Persistent AI learning model
│   │   └── transactions.json       # Persisted transaction data
│   ├── types/
│   │   └── transaction.ts          # TypeScript type definitions
│   ├── utils/
│   │   ├── formatters.ts           # Data formatting utilities
│   │   ├── timeRanges.ts           # Date/time range helpers
│   │   └── transactionUtils.ts     # Transaction processing logic
│   ├── main.jsx                    # React application entry point
│   └── index.css                   # Global styles
├── Statments/                      # Financial statements directory
│   └── [UserName]/                 # User-specific folder
│       └── [BankName]/             # Bank-specific folder
│           └── *.csv               # CSV statement files
├── server.js                       # Express API server for model persistence
├── package.json                    # Node.js dependencies and scripts
├── vite.config.js                  # Vite build configuration
├── tailwind.config.js              # Tailwind CSS configuration
└── README.md                       # This file
```

### Statement File Organization

The application reads financial statements from a structured folder hierarchy:

```
Statments/
├── User1/
│   ├── American-Express/
│   │   └── YTD_2025.csv
│   ├── Chase/
│   │   └── statement.csv
│   └── BankOfAmerica/
│       └── transactions.csv
└── User2/
    ├── American-Express/
    │   └── YTD_2025.csv
    └── Citibank/
        └── monthly_statement.csv
```

**Key Points:**
- First level: User names (automatically detected and displayed in the user selector)
- Second level: Bank names (used for organization, not displayed in UI)
- Third level: CSV files (all CSV files in bank folders are processed)
- Multiple CSV files per bank are supported and will be combined
- Folder and file names are case-sensitive

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone https://github.com/ashvtol/Financial-Tracker.git
cd Financial-Tracker
```

2. Install dependencies
```bash
npm install
```

3. Start both the API server and development server
```bash
npm start
```
Or run them separately:
```bash
# Terminal 1 - API server for AI model storage
npm run server

# Terminal 2 - React development server
npm run dev
```

4. Open your browser to `http://localhost:3000`

**Note:** The API server runs on port 3001 and handles persistent file storage of the AI learning model in `src/models/ai-model.json`.

## Usage

1. **Upload Statements**: Click "Choose Folder" and select your statements folder
   - Organize your statements in folders: `Statements/[UserName]/[BankName]/statement.csv`
   - The app will automatically detect users from the folder structure

2. **Select User View**: Use the dropdown to switch between:
   - All Users Combined
   - Individual user data

3. **Categorize Transactions**: Edit categories and the AI will learn your preferences

4. **Analyze Spending**: View charts, insights, and monthly summaries

5. **AI Model Management**:
   - The AI learning model is automatically saved to `src/models/ai-model.json` after each categorization
   - Export your model: Click "Export AI Model" to download a backup
   - Import a model: Click "Import AI Model" to restore from a backup file
   - The model persists across sessions and is shared across all users

## CSV Format

Your CSV files should include these columns:
- Date
- Description
- Amount
- Category (optional)

## Technologies Used

### Frontend
- React
- Vite
- Recharts (for visualizations)
- PapaCSV (for CSV parsing)
- Tailwind CSS
- Lucide React (icons)

### Backend
- Express.js (API server for model storage)
- Node.js File System API
- CORS enabled for local development

## License

MIT
