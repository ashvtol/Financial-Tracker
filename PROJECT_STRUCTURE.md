# Project Structure

This document describes the organization of the Financial Tracker project.

## Directory Structure

```
Finanial-Tracker/
├── src/
│   ├── components/
│   │   └── FinancialTracker.tsx    # Main application component
│   ├── constants/
│   │   ├── categories.ts           # Category definitions and colors
│   │   └── config.ts                # API URL and time range configurations
│   ├── utils/
│   │   ├── formatters.ts            # Currency and other formatting utilities
│   │   ├── timeRanges.ts            # Time range calculation functions
│   │   └── transactionUtils.ts     # Transaction-related utility functions
│   ├── types/
│   │   └── transaction.ts           # TypeScript type definitions
│   ├── main.jsx                     # Application entry point
│   └── index.css                    # Global styles
├── Statments/                       # Bank statement files (organized by user)
├── config/                          # Empty - reserved for future use
├── dist/                            # Build output directory
├── node_modules/                    # Dependencies
├── index.html                       # HTML template
├── server.js                        # Express API server for AI model persistence
├── vite.config.js                   # Vite configuration
├── tailwind.config.js               # Tailwind CSS configuration
├── postcss.config.js                # PostCSS configuration
├── package.json                     # Project dependencies and scripts
└── README.md                        # Project documentation
```

## New Features

### 1. **Visualization Filters**
   - **Time Range Selection**: Quick select buttons for common time periods
     - 1 Week, 1 Month, 3 Months, 6 Months
     - Year-to-Date (YTD), 1 Year, All Time
   - **Category Selection**: Multi-select checkboxes to filter which categories appear in charts
   - Filters apply to all charts in the Overview tab

### 2. **Code Organization**
   - **Components**: Main UI components in `src/components/`
   - **Constants**: Reusable constants like categories, colors, and config in `src/constants/`
   - **Utils**: Pure utility functions organized by purpose in `src/utils/`
   - **Types**: TypeScript type definitions in `src/types/`

## Key Files

### Components
- **FinancialTracker.tsx**: Main application component containing all the business logic and UI

### Constants
- **categories.ts**:
  - `PREDEFINED_CATEGORIES`: Default spending categories
  - `BASE_CATEGORIES`: Top-level category groups
  - `COLORS`: Chart color palette

- **config.ts**:
  - `API_URL`: Backend API endpoint
  - `TIME_RANGES`: Time range options for filtering

### Utils
- **formatters.ts**:
  - `formatCurrency()`: Formats numbers as USD currency

- **timeRanges.ts**:
  - `getTimeRangeFilter()`: Calculates start/end dates based on selected time range

- **transactionUtils.ts**:
  - `extractMerchant()`: Extracts merchant name from transaction description
  - `extractUserFromFile()`: Determines user from file path structure

### Types
- **transaction.ts**: TypeScript interfaces for:
  - `Transaction`: Individual transaction data
  - `MonthlyData`: Aggregated monthly spending data
  - `CategoryData`: Category spending summaries
  - `Summary`: Overall financial summary

## Usage

### Development
```bash
npm run dev        # Start development server on http://localhost:3000
npm run server     # Start API server on http://localhost:3001
npm start          # Start both servers
```

### Production
```bash
npm run build      # Build for production (output to dist/)
npm run preview    # Preview production build
```

## Data Flow

1. **Upload**: User uploads bank statement CSVs through the UI
2. **Parse**: Files are parsed using PapaParse library
3. **Categorize**: Transactions are auto-categorized using AI learning model
4. **Process**: Data is aggregated by month and category
5. **Filter**: Time range and category filters are applied
6. **Display**: Filtered data is visualized in charts and tables

## Best Practices

- Keep the `Statments/` folder as-is with the folder structure: `Statments/UserName/BankName/*.csv`
- Custom categories and AI learning data are automatically persisted
- Export your AI model regularly using the "Export AI Model" button
- The project follows standard React conventions for better maintainability
