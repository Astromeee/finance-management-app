import { Check } from 'lucide-react'
import type { CategoryIconName } from '../../types/finance'
import { CATEGORY_COLOR_OPTIONS, CATEGORY_ICON_OPTIONS } from '../../utils/categoryPresentation'

export function CategoryAppearancePicker({ color, icon, onColorChange, onIconChange }: { color: string; icon: CategoryIconName; onColorChange: (color: string) => void; onIconChange: (icon: CategoryIconName) => void }) {
  return <div className="category-appearance-picker">
    <fieldset><legend>Color</legend><div className="category-color-options">{CATEGORY_COLOR_OPTIONS.map((option) => <button type="button" key={option.value} className={color === option.value ? 'is-selected' : ''} style={{ background: option.value }} aria-label={`${option.label} color`} aria-pressed={color === option.value} onClick={() => onColorChange(option.value)}>{color === option.value && <Check size={16}/>}</button>)}</div></fieldset>
    <fieldset><legend>Icon</legend><div className="category-icon-options">{CATEGORY_ICON_OPTIONS.map((option) => { const Icon = option.icon; return <button type="button" key={option.value} className={icon === option.value ? 'is-selected' : ''} aria-label={`${option.label} icon`} aria-pressed={icon === option.value} title={option.label} onClick={() => onIconChange(option.value)}><Icon size={20}/></button> })}</div></fieldset>
  </div>
}
