import { createElement } from 'react'
import type { TransactionType } from '../../types/finance'
import { categoryIconFor } from './categoryIconMap'

interface CategoryIconProps {
  className?: string
  label?: string
  size?: number
  type?: TransactionType
}

export function CategoryIcon({ className, label, size = 20, type }: CategoryIconProps) {
  return createElement(categoryIconFor(label, type), { 'aria-hidden': true, className, size, strokeWidth: 1.8 })
}
