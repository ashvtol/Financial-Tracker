export const getTimeRangeFilter = (timeRange: string): { start: Date; end: Date } | null => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (timeRange) {
    case '1w':
      const oneWeekAgo = new Date(today);
      oneWeekAgo.setDate(today.getDate() - 7);
      return { start: oneWeekAgo, end: now };
    case '1m':
      const oneMonthAgo = new Date(today);
      oneMonthAgo.setMonth(today.getMonth() - 1);
      return { start: oneMonthAgo, end: now };
    case '3m':
      const threeMonthsAgo = new Date(today);
      threeMonthsAgo.setMonth(today.getMonth() - 3);
      return { start: threeMonthsAgo, end: now };
    case '6m':
      const sixMonthsAgo = new Date(today);
      sixMonthsAgo.setMonth(today.getMonth() - 6);
      return { start: sixMonthsAgo, end: now };
    case 'ytd':
      const yearStart = new Date(now.getFullYear(), 0, 1);
      return { start: yearStart, end: now };
    case '1y':
      const oneYearAgo = new Date(today);
      oneYearAgo.setFullYear(today.getFullYear() - 1);
      return { start: oneYearAgo, end: now };
    case 'all':
    default:
      return null;
  }
};
