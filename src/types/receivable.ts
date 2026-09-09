export type Receivable = {
  id: string
  person: string
  amount: number
  received: number
  written_off: number
  due_date: string | null
  notes: string | null
  created_at: string
  archived: boolean
}
export function outstanding(item: Receivable) { return Math.max(0, item.amount - item.received - item.written_off) }
