import {
  BadgeDollarSign,
  BanknoteArrowDown,
  BanknoteArrowUp,
  BriefcaseBusiness,
  BusFront,
  CarFront,
  Coffee,
  Dumbbell,
  Fuel,
  Gift,
  GraduationCap,
  HandCoins,
  HeartPulse,
  House,
  Landmark,
  Laptop,
  Pill,
  Plane,
  ReceiptText,
  RotateCcw,
  Scissors,
  Shirt,
  ShoppingBag,
  ShoppingBasket,
  Smartphone,
  Sparkles,
  Target,
  Ticket,
  Utensils,
  Users,
  WalletCards,
  Wifi,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { TransactionType } from '../../types/finance'

const categoryRules: Array<{ icon: LucideIcon; pattern: RegExp }> = [
  { pattern: /rent|apartment|home|house|utility/i, icon: House },
  { pattern: /grocery|groceries|food|supermarket/i, icon: ShoppingBasket },
  { pattern: /coffee|cafe/i, icon: Coffee },
  { pattern: /dining|restaurant|meal/i, icon: Utensils },
  { pattern: /transport|uber|indrive|bus|train/i, icon: BusFront },
  { pattern: /petrol|fuel|gas/i, icon: Fuel },
  { pattern: /car|vehicle|repair/i, icon: CarFront },
  { pattern: /health|doctor|hospital|dental|dentist/i, icon: HeartPulse },
  { pattern: /medicine|medication|pharmacy/i, icon: Pill },
  { pattern: /family|friend|sibling|parent|support/i, icon: Users },
  { pattern: /cutting|grooming|salon|barber/i, icon: Scissors },
  { pattern: /subscription|internet|wifi/i, icon: Wifi },
  { pattern: /electric|energy|bill/i, icon: Zap },
  { pattern: /shopping|clothes|clothing/i, icon: ShoppingBag },
  { pattern: /gym|fitness/i, icon: Dumbbell },
  { pattern: /travel|flight|umrah/i, icon: Plane },
  { pattern: /education|school|course|scholarship/i, icon: GraduationCap },
  { pattern: /client|work|salary|business/i, icon: BriefcaseBusiness },
  { pattern: /gift/i, icon: Gift },
  { pattern: /refund|reimbursement/i, icon: RotateCcw },
  { pattern: /phone|mobile/i, icon: Smartphone },
  { pattern: /computer|laptop|software/i, icon: Laptop },
  { pattern: /laundry/i, icon: Shirt },
  { pattern: /repair|maintenance/i, icon: Wrench },
  { pattern: /movie|cinema|ticket|entertainment/i, icon: Ticket },
  { pattern: /cash|wallet/i, icon: WalletCards },
  { pattern: /bank|account/i, icon: Landmark },
  { pattern: /goal|saving/i, icon: Target },
  { pattern: /debt|owed|payment/i, icon: HandCoins },
  { pattern: /income|earning/i, icon: BanknoteArrowDown },
  { pattern: /expense|spending/i, icon: BanknoteArrowUp },
  { pattern: /misc|other|unexplained/i, icon: Sparkles },
]

function fallbackIcon(type?: TransactionType): LucideIcon {
  if (type === 'income') return BanknoteArrowDown
  if (type === 'expense') return BanknoteArrowUp
  if (type === 'transfer') return RotateCcw
  if (type === 'goal' || type === 'goal_saving') return Target
  if (type === 'debt' || type === 'debt_payment') return ReceiptText
  return BadgeDollarSign
}

export function categoryIconFor(label = '', type?: TransactionType): LucideIcon {
  return categoryRules.find((rule) => rule.pattern.test(label))?.icon ?? fallbackIcon(type)
}
