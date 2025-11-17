# Advanced Financial Tracker

An AI-powered financial tracking application with smart categorization, user management, and comprehensive analytics.

## Features

- **Multi-User Support**: Upload folder structures to automatically organize transactions by user
- **AI-Powered Categorization**: Smart transaction categorization with learning capabilities
- **Refund Matching**: Automatically matches charges with refunds to show net spending
- **Custom Categories**: Create and manage your own spending categories
- **Interactive Visualizations**: Charts and graphs for spending analysis
- **Data Export/Import**: Export and import AI learning models
- **Combined & Individual Views**: View data for individual users or all users combined

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone <your-repo-url>
cd Finanial-Tracker
```

2. Install dependencies
```bash
npm install
```

3. Start the development server
```bash
npm run dev
```

4. Open your browser to `http://localhost:3000`

## Usage

1. **Upload Statements**: Click "Choose Folder" and select your statements folder
   - Organize your statements in folders: `Statements/[UserName]/[BankName]/statement.csv`
   - The app will automatically detect users from the folder structure

2. **Select User View**: Use the dropdown to switch between:
   - All Users Combined
   - Individual user data

3. **Categorize Transactions**: Edit categories and the AI will learn your preferences

4. **Analyze Spending**: View charts, insights, and monthly summaries

## CSV Format

Your CSV files should include these columns:
- Date
- Description
- Amount
- Category (optional)

## Technologies Used

- React
- Vite
- Recharts (for visualizations)
- PapaCSV (for CSV parsing)
- Tailwind CSS
- Lucide React (icons)

## License

MIT
