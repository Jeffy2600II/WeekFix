export interface BudgetItem {
  id: string;
  name: string;
  amount: number;
  dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday' | 'All';
  expiryDate: string; 
  createdAt: string;
}

export interface WeeklyBudget {
  income: number;
  items: BudgetItem[];
}
