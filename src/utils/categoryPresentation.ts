import { Car, GraduationCap, Heart, Home, Music, Receipt, ShoppingBag, ShoppingBasket, Smartphone, UtensilsCrossed, Wallet, type LucideIcon } from 'lucide-react'
import type { Category } from '../types/finance'

const CATEGORY_PRESENTATIONS: Array<{ match: RegExp; color: string; icon: LucideIcon }> = [
  { match: /din(e|ing)|food|restaurant/i, color: '#E2703A', icon: UtensilsCrossed },
  { match: /transport|fuel|travel|car/i, color: '#6B7A85', icon: Car },
  { match: /grocer/i, color: '#7C8A6B', icon: ShoppingBasket },
  { match: /bill|util|rent|housing/i, color: '#B08968', icon: Receipt },
  { match: /shop|cloth/i, color: '#9B6A7D', icon: ShoppingBag },
  { match: /health|care|medic/i, color: '#C79A3E', icon: Heart },
  { match: /fun|entertain|game/i, color: '#8A8A3F', icon: Music },
  { match: /mobile|internet|phone/i, color: '#6B7A85', icon: Smartphone },
  { match: /educat|school|fee/i, color: '#8A7B63', icon: GraduationCap },
  { match: /home|family/i, color: '#B08968', icon: Home },
]

export function categoryPresentationFor(category: Category) {
  const match = CATEGORY_PRESENTATIONS.find((entry) => entry.match.test(category.name))
  return { color: match?.color ?? category.color ?? '#9A8F7D', icon: match?.icon ?? Wallet }
}
