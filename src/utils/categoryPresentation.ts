import {
  BriefcaseBusiness,
  BusFront,
  CarFront,
  Coffee,
  Dumbbell,
  Fuel,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  Landmark,
  Music,
  Pill,
  Plane,
  ReceiptText,
  Scissors,
  Shirt,
  ShoppingBag,
  ShoppingBasket,
  Smartphone,
  Ticket,
  UtensilsCrossed,
  WalletCards,
  Wifi,
  type LucideIcon,
} from 'lucide-react'
import type { Category, CategoryIconName } from '../types/finance'

export const CATEGORY_COLOR_OPTIONS = [
  { value: '#E2703A', label: 'Clay' },
  { value: '#7C8A6B', label: 'Sage' },
  { value: '#6B7A85', label: 'Slate' },
  { value: '#C79A3E', label: 'Gold' },
  { value: '#B08968', label: 'Sand' },
  { value: '#9B6A7D', label: 'Mauve' },
  { value: '#8A8A3F', label: 'Olive' },
  { value: '#8A7B63', label: 'Taupe' },
] as const

export const CATEGORY_ICON_OPTIONS: Array<{ value: CategoryIconName; label: string; icon: LucideIcon }> = [
  { value: 'home', label: 'Home', icon: House },
  { value: 'dining', label: 'Dining', icon: UtensilsCrossed },
  { value: 'groceries', label: 'Groceries', icon: ShoppingBasket },
  { value: 'coffee', label: 'Coffee', icon: Coffee },
  { value: 'car', label: 'Car', icon: CarFront },
  { value: 'transport', label: 'Transport', icon: BusFront },
  { value: 'fuel', label: 'Fuel', icon: Fuel },
  { value: 'shopping', label: 'Shopping', icon: ShoppingBag },
  { value: 'clothing', label: 'Clothing', icon: Shirt },
  { value: 'health', label: 'Health', icon: HeartPulse },
  { value: 'medicine', label: 'Medicine', icon: Pill },
  { value: 'education', label: 'Education', icon: GraduationCap },
  { value: 'bills', label: 'Bills', icon: ReceiptText },
  { value: 'phone', label: 'Phone', icon: Smartphone },
  { value: 'internet', label: 'Internet', icon: Wifi },
  { value: 'entertainment', label: 'Entertainment', icon: Music },
  { value: 'tickets', label: 'Tickets', icon: Ticket },
  { value: 'work', label: 'Work', icon: BriefcaseBusiness },
  { value: 'gift', label: 'Gift', icon: Gift },
  { value: 'wallet', label: 'Wallet', icon: WalletCards },
  { value: 'bank', label: 'Bank', icon: Landmark },
  { value: 'fitness', label: 'Fitness', icon: Dumbbell },
  { value: 'travel', label: 'Travel', icon: Plane },
  { value: 'grooming', label: 'Grooming', icon: Scissors },
]

const CATEGORY_PRESENTATIONS: Array<{ match: RegExp; color: string; icon: CategoryIconName }> = [
  { match: /din(e|ing)|food|restaurant/i, color: '#E2703A', icon: 'dining' },
  { match: /transport|bus|train/i, color: '#6B7A85', icon: 'transport' },
  { match: /fuel|petrol|gas/i, color: '#6B7A85', icon: 'fuel' },
  { match: /travel|flight/i, color: '#6B7A85', icon: 'travel' },
  { match: /car|vehicle/i, color: '#6B7A85', icon: 'car' },
  { match: /grocer/i, color: '#7C8A6B', icon: 'groceries' },
  { match: /bill|util|rent|housing|apartment/i, color: '#B08968', icon: 'home' },
  { match: /shop/i, color: '#9B6A7D', icon: 'shopping' },
  { match: /cloth/i, color: '#9B6A7D', icon: 'clothing' },
  { match: /health|care|doctor/i, color: '#C79A3E', icon: 'health' },
  { match: /medic|pharmacy/i, color: '#C79A3E', icon: 'medicine' },
  { match: /fun|entertain|game/i, color: '#8A8A3F', icon: 'entertainment' },
  { match: /mobile|phone/i, color: '#6B7A85', icon: 'phone' },
  { match: /internet|wifi/i, color: '#6B7A85', icon: 'internet' },
  { match: /educat|school|fee/i, color: '#8A7B63', icon: 'education' },
  { match: /work|business|salary|freelance/i, color: '#7C8A6B', icon: 'work' },
  { match: /gift/i, color: '#9B6A7D', icon: 'gift' },
  { match: /groom|salon|barber|cutting/i, color: '#8A7B63', icon: 'grooming' },
  { match: /home|family/i, color: '#B08968', icon: 'home' },
]

export function categoryIconForName(name?: CategoryIconName): LucideIcon {
  return CATEGORY_ICON_OPTIONS.find((option) => option.value === name)?.icon ?? WalletCards
}

export function suggestedCategoryIcon(category: Pick<Category, 'name' | 'kind' | 'icon'>): CategoryIconName {
  return category.icon ?? CATEGORY_PRESENTATIONS.find((entry) => entry.match.test(category.name))?.icon ?? (category.kind === 'income' ? 'work' : 'wallet')
}

export function categoryPresentationFor(category: Category) {
  const match = CATEGORY_PRESENTATIONS.find((entry) => entry.match.test(category.name))
  const iconName = suggestedCategoryIcon(category)
  return { color: category.color || match?.color || '#8A7B63', icon: categoryIconForName(iconName), iconName }
}
