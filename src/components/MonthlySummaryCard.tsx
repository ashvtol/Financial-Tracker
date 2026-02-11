import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { getCategoryColor, getCategoryEmoji } from '../constants/categoryColors';
import { formatCurrency } from '../utils/formatters';

interface CategoryTotal {
  category: string;
  total: number;
}

interface MonthData {
  month: string;
  categories: CategoryTotal[];
  monthTotal: number;
}

interface MonthlySummaryCardProps {
  data: MonthData[];
}

export function MonthlySummaryCard({ data }: MonthlySummaryCardProps) {
  const { isDark } = useTheme();
  // Expand the first month by default
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(() => {
    return new Set(data.length > 0 ? [data[0].month] : []);
  });

  const toggleMonth = (month: string) => {
    setExpandedMonths(prev => {
      const newSet = new Set(prev);
      if (newSet.has(month)) {
        newSet.delete(month);
      } else {
        newSet.add(month);
      }
      return newSet;
    });
  };

  if (data.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-dark-card rounded-lg shadow dark:shadow-none dark:border dark:border-dark-border mb-8 overflow-hidden transition-theme">
      <div className="bg-gray-50 dark:bg-dark-surface px-6 py-4 border-b dark:border-dark-border">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Monthly Spending by Category</h3>
      </div>
      <div className="px-4 py-4 space-y-2">
        {data.map((monthData) => {
          const isExpanded = expandedMonths.has(monthData.month);
          const maxAmount = Math.max(...monthData.categories.map(c => c.total));

          return (
            <div key={monthData.month} className="border dark:border-dark-border rounded-lg overflow-hidden">
              {/* Month Header */}
              <button
                onClick={() => toggleMonth(monthData.month)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-dark-surface hover:bg-gray-100 dark:hover:bg-dark-border transition-colors"
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                  )}
                  <span className="font-semibold text-gray-800 dark:text-white">{monthData.month}</span>
                </div>
                <span className="text-lg font-bold text-blue-600 dark:text-accent-blue">
                  {formatCurrency(monthData.monthTotal)}
                </span>
              </button>

              {/* Category Rows */}
              {isExpanded && (
                <div className="px-4 py-2 space-y-0.5">
                  {monthData.categories.map((cat) => {
                    const color = getCategoryColor(cat.category, isDark);
                    const percent = monthData.monthTotal > 0
                      ? Math.round((cat.total / monthData.monthTotal) * 100)
                      : 0;
                    const barWidth = maxAmount > 0
                      ? Math.round((cat.total / maxAmount) * 100)
                      : 0;

                    return (
                      <div key={cat.category} className="flex items-center gap-3 py-0.5">
                        {/* Emoji */}
                        <span className="flex-shrink-0 text-base">{getCategoryEmoji(cat.category)}</span>

                        {/* Category name */}
                        <span className="w-44 text-sm text-gray-700 dark:text-slate-300 truncate">
                          {cat.category}
                        </span>

                        {/* Progress bar */}
                        <div className="flex-1 h-2 bg-gray-200 dark:bg-dark-border rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${barWidth}%`,
                              backgroundColor: color
                            }}
                          />
                        </div>

                        {/* Amount */}
                        <span className="w-24 text-right text-sm font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(cat.total)}
                        </span>

                        {/* Percentage */}
                        <span className="w-12 text-right text-xs text-gray-500 dark:text-slate-400">
                          {percent}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
