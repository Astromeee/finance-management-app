import type { Account, Budget, Debt, Goal, Transaction, UpcomingExpense } from '../types/finance'
import { localDateKey } from './date'

const csvCell = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`

function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function exportTransactionsCsv(transactions: Transaction[]) {
  const columns: Array<keyof Transaction> = ['date', 'title', 'type', 'category', 'account', 'amount', 'notes']
  const rows = [columns.map(csvCell).join(','), ...transactions.map((item) => columns.map((key) => csvCell(item[key])).join(','))]
  download(`pocket-ledger-transactions-${localDateKey()}.csv`, rows.join('\n'), 'text/csv;charset=utf-8')
}

export function exportLedgerJson(data: {
  accounts: Account[]; transactions: Transaction[]; budgets: Budget[]; goals: Goal[];
  debts: Debt[]; upcomingExpenses: UpcomingExpense[]; expenseCategories: string[]; incomeCategories: string[]
}) {
  download(
    `pocket-ledger-backup-${localDateKey()}.json`,
    JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), currency: 'PKR', timezone: 'Asia/Karachi', ...data }, null, 2),
    'application/json',
  )
}
