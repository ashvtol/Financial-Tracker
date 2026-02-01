import { COLORS, COLORS_DARK } from './categories';

// Map categories to consistent color indices for uniform appearance across the app
export const CATEGORY_COLOR_MAP: Record<string, number> = {
  'Groceries': 0,
  'Whole Foods Groceries': 0,
  'Food & Dining': 1,
  'Coffee Shop': 1,
  'Transportation - Cab/Rideshare': 2,
  'Transportation - Parking': 2,
  'Transportation - Fuel': 2,
  'Transportation - Tolls': 2,
  'Transportation - Public Transit': 2,
  'Transportation - Other': 2,
  'Transportation': 2,
  'Entertainment': 3,
  'Entertainment - Outdoors': 3,
  'Digital Entertainment': 3,
  'Healthcare': 4,
  'Shopping': 5,
  'Housing & Utilities': 6,
  'Travel': 7,
  'Subscriptions': 8,
  'Phone & Internet': 8,
  'Gifts & Donations': 9,
  'Education': 0,
  'Investments': 1,
  'Insurance': 2,
  'Bank Fees': 3,
  'Personal Care': 4,
  'Payment': 5,
  'Credits/Refunds': 6,
  'Car Maintenance': 7,
  'Income - Salary': 8,
  'Income - Interest': 8,
  'Income - Other': 8,
  'Transfer': 9,
  'Nespresso': 1,
  'Addictions': 3,
  'Fees': 3,
  'Other': 9,
};

// Get the color index for a category, with fallback for unknown categories
export function getCategoryColorIndex(category: string): number {
  if (CATEGORY_COLOR_MAP.hasOwnProperty(category)) {
    return CATEGORY_COLOR_MAP[category];
  }
  // Generate a consistent index based on the category string hash
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = ((hash << 5) - hash) + category.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash) % COLORS.length;
}

// Get the actual color for a category based on theme
export function getCategoryColor(category: string, isDark: boolean = false): string {
  const index = getCategoryColorIndex(category);
  return isDark ? COLORS_DARK[index] : COLORS[index];
}

// Emoji map for categories
export const CATEGORY_EMOJI_MAP: Record<string, string> = {
  'Groceries': '🛒',
  'Whole Foods Groceries': '🥬',
  'Food & Dining': '🍽️',
  'Coffee Shop': '☕',
  'Transportation - Cab/Rideshare': '🚗',
  'Transportation - Parking': '🅿️',
  'Transportation - Fuel': '⛽',
  'Transportation - Tolls': '🛣️',
  'Transportation - Public Transit': '🚇',
  'Transportation - Other': '🚌',
  'Transportation': '🚗',
  'Entertainment': '🎬',
  'Entertainment - Outdoors': '🏕️',
  'Digital Entertainment': '🎮',
  'Healthcare': '🏥',
  'Shopping': '🛍️',
  'Housing & Utilities': '🏠',
  'Travel': '✈️',
  'Subscriptions': '📺',
  'Phone & Internet': '📱',
  'Gifts & Donations': '🎁',
  'Education': '📚',
  'Investments': '📈',
  'Insurance': '🛡️',
  'Bank Fees': '🏦',
  'Personal Care': '💅',
  'Payment': '💳',
  'Credits/Refunds': '💰',
  'Car Maintenance': '🔧',
  'Income - Salary': '💵',
  'Income - Interest': '💹',
  'Income - Other': '💵',
  'Transfer': '🔄',
  'Nespresso': '☕',
  'Addictions': '🚬',
  'Fees': '💸',
  'Other': '📦',
};

// Get the emoji for a category, with fallback for unknown categories
export function getCategoryEmoji(category: string): string {
  if (CATEGORY_EMOJI_MAP.hasOwnProperty(category)) {
    return CATEGORY_EMOJI_MAP[category];
  }
  return '📦'; // Default emoji for unknown categories
}
