# Changelog

## [Latest] - 2025-11-18

### Added
- **Visualization Filters**: New filter panel in Overview tab
  - Time range quick select: 1w, 1m, 3m, 6m, YTD, 1y, All Time
  - Category multi-select: Choose which categories to display in charts
  - Filters apply dynamically to all visualizations

### Changed
- **Project Structure Reorganization**:
  - Created standard React project structure
  - Moved `financial-tracker.tsx` → `src/components/FinancialTracker.tsx`
  - Extracted constants to `src/constants/` directory
  - Extracted utility functions to `src/utils/` directory
  - Created TypeScript type definitions in `src/types/`
  - Removed duplicate code (formatCurrency, extractMerchant, extractUserFromFile, etc.)
  - Updated imports to use new module locations

### New Files
- `src/constants/categories.ts` - Category definitions and color palette
- `src/constants/config.ts` - API URL and time range configurations
- `src/utils/formatters.ts` - Currency formatting utility
- `src/utils/timeRanges.ts` - Time range calculation functions
- `src/utils/transactionUtils.ts` - Transaction-related utilities
- `src/types/transaction.ts` - TypeScript type definitions
- `PROJECT_STRUCTURE.md` - Documentation of project organization
- `CHANGELOG.md` - This file

### Improved
- Better code organization and maintainability
- Reduced code duplication
- Clearer separation of concerns
- Type safety with TypeScript interfaces
- Easier to find and modify specific functionality

## Features Overview

### Time Range Filters
Users can now quickly filter data by time period:
- **1 Week**: Last 7 days
- **1 Month**: Last 30 days
- **3 Months**: Last 90 days
- **6 Months**: Last 180 days
- **YTD**: Year-to-date (from Jan 1 of current year)
- **1 Year**: Last 365 days
- **All Time**: No date filtering (default)

### Category Filters
Users can select specific categories to display in charts:
- Multi-select checkboxes for all available categories
- "Clear Selection" button to reset filters
- Shows count of selected categories
- Empty selection = show all categories

### Code Organization Benefits
- **Maintainability**: Easier to find and update specific functionality
- **Reusability**: Utility functions can be used across components
- **Testing**: Isolated functions are easier to test
- **Scalability**: Clear structure for adding new features
- **Type Safety**: TypeScript definitions prevent common errors

## Migration Notes

No breaking changes. All existing functionality remains the same:
- Statement upload and parsing
- AI-powered categorization
- Learning model persistence
- Multi-user support
- Refund matching
- All existing charts and visualizations

## Technical Details

### Dependencies
No new dependencies added. Project uses the same packages:
- React 18.2.0
- Recharts 2.10.0
- Vite 5.0.0
- Tailwind CSS 3.3.5
- Express 5.1.0 (for API server)

### Build System
- No changes to build configuration
- Config files remain in root directory for tool compatibility
- Build output still goes to `dist/` directory
