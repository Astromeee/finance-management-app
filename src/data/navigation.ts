import { CreditCard, Home, List, PieChart, Settings, Target, Wallet } from 'lucide-react'
import type { NavItem } from '../types/finance'

export const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Home', icon: Home },
  { id: 'transactions', label: 'Transactions', icon: List },
  { id: 'accounts', label: 'Cards', icon: CreditCard },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'budgets', label: 'Budgets', icon: Wallet },
  { id: 'reports', label: 'Analytics', icon: PieChart },
  { id: 'settings', label: 'Settings', icon: Settings },
]
