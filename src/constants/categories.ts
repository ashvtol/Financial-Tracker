export const PREDEFINED_CATEGORIES = [
  'Digital Entertainment', 'Entertainment', 'Food & Dining', 'Groceries', 'Whole Foods Groceries',
  'Transportation - Parking', 'Transportation - Cab/Rideshare', 'Transportation - Fuel',
  'Transportation - Tolls', 'Transportation - Public Transit', 'Transportation - Other',
  'Housing & Utilities', 'Shopping', 'Healthcare', 'Education', 'Travel', 'Investments',
  'Insurance', 'Bank Fees', 'Personal Care', 'Gifts & Donations',
  'Subscriptions', 'Phone & Internet', 'Payment', 'Credits/Refunds', 'Car Maintenance',
  'Income - Salary', 'Income - Interest', 'Income - Other', 'Transfer', 'Other'
];

export const BASE_CATEGORIES = [
  'Digital Entertainment', 'Entertainment', 'Food & Dining', 'Groceries',
  'Transportation', 'Housing & Utilities', 'Shopping', 'Healthcare',
  'Education', 'Travel', 'Investments', 'Insurance', 'Bank Fees',
  'Personal Care', 'Gifts & Donations', 'Subscriptions', 'Phone & Internet', 'Other'
];

// iOS-inspired Copilot Money color palette
export const COLORS = [
  '#0263c5',  // Primary blue (Copilot accent)
  '#00a67d',  // Teal green
  '#ff9500',  // Orange
  '#af52de',  // Purple
  '#5856d6',  // Indigo
  '#ff3b30',  // Red
  '#34c759',  // Green
  '#007aff',  // iOS blue
  '#ff6482',  // Pink
  '#8e8e93',  // Gray
];

// Softer colors for dark mode
export const COLORS_DARK = [
  '#4da3ff',  // Softer blue
  '#2dd4a8',  // Softer teal
  '#ffb347',  // Softer orange
  '#c77dff',  // Softer purple
  '#7b7bff',  // Softer indigo
  '#ff6b6b',  // Softer red
  '#5ce07a',  // Softer green
  '#5ab0ff',  // Softer iOS blue
  '#ff8fa3',  // Softer pink
  '#a8a8ad',  // Softer gray
];

export const CHART_COLORS = {
  light: {
    grid: '#f0f0f0',  // Very subtle grid
    axis: '#8e8e93',
    tooltip: {
      bg: '#ffffff',
      border: 'rgba(0, 0, 0, 0.08)',
      text: '#1c1c1e',
    },
    expense: '#ff3b30',
    income: '#34c759',
    credit: '#007aff',
    area: {
      expense: 'rgba(255, 59, 48, 0.15)',
      income: 'rgba(52, 199, 89, 0.15)',
    },
  },
  dark: {
    grid: '#2c2c2e',  // Very subtle dark grid
    axis: '#8e8e93',
    tooltip: {
      bg: '#1c1c1e',
      border: '#3a3a3c',
      text: '#f5f5f7',
    },
    expense: '#ff6b6b',
    income: '#5ce07a',
    credit: '#5ab0ff',
    area: {
      expense: 'rgba(255, 107, 107, 0.2)',
      income: 'rgba(92, 224, 122, 0.2)',
    },
  },
};
