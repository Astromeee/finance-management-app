import { BarChart3, CreditCard, Flag, Home, List, PieChart, Settings } from 'lucide-react'
import type { NavItem } from '../types/finance'

export const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Home', icon: Home },
  { id: 'transactions', label: 'Transactions', icon: List },
  { id: 'accounts', label: 'Cards', icon: CreditCard },
  { id: 'goals', label: 'Goals', icon: Flag },
  { id: 'budgets', label: 'Budgets', icon: PieChart },
  { id: 'reports', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
]
