import { useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { COLORS, COLORS_DARK, CHART_COLORS } from '../constants/categories';

export function useChartColors() {
  const { isDark } = useTheme();

  return useMemo(() => {
    const colors = isDark ? COLORS_DARK : COLORS;
    const chart = isDark ? CHART_COLORS.dark : CHART_COLORS.light;

    const getColor = (index: number) => colors[index % colors.length];

    return {
      colors,
      chart,
      getColor,
      isDark,
    };
  }, [isDark]);
}
