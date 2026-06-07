import type { Account, Budget, Category, Debt, Goal, Transaction } from '../types/finance'

export const accounts: Account[] = [
  { id: 'cash', name: 'Cash', type: 'cash', balance: 8500, color: '#34d399', activity: 'Groceries, transport, and daily cash' },
  { id: 'hbl', name: 'HBL Account', type: 'bank', balance: 45000, color: '#60a5fa', activity: 'Parents support received' },
  { id: 'meezan', name: 'Meezan Bank', type: 'bank', balance: 22000, color: '#a78bfa', activity: 'Course fee reserved' },
  { id: 'jazzcash', name: 'JazzCash', type: 'wallet', balance: 6000, color: '#f97316', activity: 'Mobile package paid' },
  { id: 'easypaisa', name: 'Easypaisa', type: 'wallet', balance: 3500, color: '#22d3ee', activity: 'Dining split settled' },
]

export const incomeSources: Category[] = [
  'Parents Support', 'Pocket Money', 'Freelancing Payment', 'Siblings Support', 'Sold Old Phone', 'Unexplained Income', 'Gift', 'Refund', 'Scholarship', 'Other Income',
].map((name, index) => ({ id: name.toLowerCase().replaceAll(' ', '-'), name, kind: 'income', color: ['#ddff45', '#8be28f', '#d4d4d0', '#aeb7c5'][index % 4] }))

export const expenseCategories: Category[] = [
  'Apartment Rent', 'Electricity Bill', 'University Fee', 'Food & Groceries', 'Dining Out', 'Clothes', 'Mobile Package', 'Transport', 'Course Fee', 'Canva Subscription', 'Unexplained Expense', 'Health', 'Family/Friends', 'Miscellaneous',
].map((name, index) => ({ id: name.toLowerCase().replaceAll(' ', '-'), name, kind: 'expense', color: ['#ddff45', '#d4d4d0', '#8f949c', '#e98d67', '#aeb7c5', '#c9a46a'][index % 6] }))

export const transactions: Transaction[] = [
  { id: 't1', title: 'Parents monthly support', amount: 50000, type: 'income', category: 'Parents Support', account: 'HBL Account', date: '2026-06-01', notes: 'June allowance' },
  { id: 't2', title: 'Freelancing payment', amount: 20000, type: 'income', category: 'Freelancing Payment', account: 'Meezan Bank', date: '2026-06-03' },
  { id: 't3', title: 'Food & groceries run', amount: 7200, type: 'expense', category: 'Food & Groceries', account: 'Cash', date: '2026-06-04' },
  { id: 't4', title: 'University transport', amount: 1800, type: 'expense', category: 'Transport', account: 'JazzCash', date: '2026-06-04' },
  { id: 't5', title: 'Dinner with friends', amount: 2500, type: 'expense', category: 'Dining Out', account: 'Easypaisa', date: '2026-06-02', notes: 'Split pending' },
  { id: 't6', title: 'Course fee installment', amount: 5000, type: 'expense', category: 'Course Fee', account: 'Meezan Bank', date: '2026-06-02' },
  { id: 't7', title: 'Move cash from HBL', amount: 10000, type: 'transfer', category: 'Transfer', account: 'HBL Account to Cash', date: '2026-06-01' },
  { id: 't8', title: 'Laptop goal saving', amount: 8000, type: 'goal', category: 'New Laptop', account: 'HBL Account', date: '2026-06-03' },
  { id: 't9', title: 'Laptop installment paid', amount: 7000, type: 'debt', category: 'Laptop Installment', account: 'Meezan Bank', date: '2026-06-03' },
  { id: 't10', title: 'Clothes shopping', amount: 11200, type: 'expense', category: 'Clothes', account: 'HBL Account', date: '2026-06-01' },
]

export const goals: Goal[] = [
  { id: 'g1', name: 'New Laptop', target: 250000, saved: 60000, dueDate: '2026-12-15', status: 'Active' },
  { id: 'g2', name: 'Emergency Fund', target: 100000, saved: 25000, dueDate: '2026-10-01', status: 'Active' },
  { id: 'g3', name: 'Course Fee', target: 60000, saved: 15000, dueDate: '2026-08-20', status: 'Active' },
]

export const debts: Debt[] = [
  { id: 'd1', name: 'Laptop Installment', total: 100000, paid: 35000, dueDate: '2026-09-30', status: 'Active' },
  { id: 'd2', name: 'Pending Course Fee', total: 50000, paid: 20000, dueDate: '2026-07-15', status: 'Active' },
  { id: 'd3', name: 'Borrowed from Sibling', total: 25000, paid: 10000, dueDate: '2026-06-10', status: 'Overdue' },
]

export const budgets: Budget[] = [
  { id: 'b1', category: 'Food & Groceries', amount: 20000, used: 12000 },
  { id: 'b2', category: 'Dining Out', amount: 8000, used: 6500 },
  { id: 'b3', category: 'Clothes', amount: 10000, used: 11200 },
  { id: 'b4', category: 'Transport', amount: 6000, used: 4500 },
  { id: 'b5', category: 'Course Fee', amount: 15000, used: 5000 },
]

export const categorySpend = [
  { name: 'Food & Groceries', value: 12000, color: '#ddff45' },
  { name: 'Clothes', value: 11200, color: '#d4d4d0' },
  { name: 'Dining Out', value: 6500, color: '#e98d67' },
  { name: 'Course Fee', value: 5000, color: '#aeb7c5' },
  { name: 'Transport', value: 4500, color: '#8f949c' },
]

export const weeklyTrend = [
  { day: 'Mon', spending: 9200, income: 50000 },
  { day: 'Tue', spending: 7800, income: 0 },
  { day: 'Wed', spending: 12400, income: 20000 },
  { day: 'Thu', spending: 5100, income: 0 },
  { day: 'Fri', spending: 6800, income: 0 },
  { day: 'Sat', spending: 4200, income: 0 },
  { day: 'Sun', spending: 3000, income: 0 },
]

export const incomeBreakdown = [
  { source: 'Parents', amount: 50000 },
  { source: 'Freelance', amount: 20000 },
  { source: 'Pocket', amount: 0 },
  { source: 'Sold Phone', amount: 0 },
]
