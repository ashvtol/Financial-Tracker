import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { getCategoryColor, getCategoryEmoji } from '../constants/categoryColors';

interface CategoryTagProps {
  category: string;
  className?: string;
}

export function CategoryTag({ category, className = '' }: CategoryTagProps) {
  const { isDark } = useTheme();
  const color = getCategoryColor(category, isDark);
  const emoji = getCategoryEmoji(category);

  // Create a subtle background with low opacity
  const bgColor = `${color}15`;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${className}`}
      style={{ backgroundColor: bgColor }}
    >
      <span className="flex-shrink-0">{emoji}</span>
      <span className="text-gray-700 dark:text-gray-200 truncate">
        {category}
      </span>
    </span>
  );
}
