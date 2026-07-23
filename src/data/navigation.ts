import { CreditCard, Home, List, PieChart, Settings, Target, Wallet } from 'lucide-react'
import type { NavItem } from '../types/finance'

export const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Home', icon: Home },
  { id: 'transactions', label: 'Ledger', icon: List },
  { id: 'accounts', label: 'Wallet', icon: CreditCard },
  { id: 'budgets', label: 'Plan', icon: Wallet },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'reports', label: 'Insights', icon: PieChart },
  { id: 'settings', label: 'Settings', icon: Settings },
]
