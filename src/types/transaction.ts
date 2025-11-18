export interface Transaction {
  id: string;
  date: Date;
  description: string;
  amount: number;
  category: string;
  source: string;
  user: string;
  isExpense: boolean;
  isCredit: boolean;
  isImmutableCategory: boolean;
  isRefunded?: boolean;
  netAmount?: number;
}

export interface MonthlyData {
  month: string;
  date: string;
  expenses: number;
  credits: number;
  netSpending: number;
}

export interface CategoryData {
  name: string;
  value: number;
  credits: number;
  count: number;
  transactions: Transaction[];
  avgTransaction: number;
}

export interface Summary {
  totalIncome: number;
  totalExpenses: number;
  totalSavings: number;
  avgMonthlySpending: number;
}
