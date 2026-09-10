import type { Account, Budget, Debt, Goal, Transaction, UpcomingExpense } from '../types/finance'
import type { Receivable } from '../types/receivable'
import { localDateKey } from './date'
import { isNativeApp } from './platform'

const csvCell = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`

async function download(filename: string, content: string, type: string) {
  if (isNativeApp) {
    const [{ Filesystem, Directory, Encoding }, { Share }] = await Promise.all([
      import('@capacitor/filesystem'), import('@capacitor/share'),
    ])
    const file = await Filesystem.writeFile({
      path: `exports/${filename}`, data: content,
      directory: Directory.Cache, encoding: Encoding.UTF8, recursive: true,
    })
    await Share.share({ title: filename, files: [file.uri], dialogTitle: 'Save or share your export' })
    return
  }
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
  return download(`pocket-ledger-transactions-${localDateKey()}.csv`, rows.join('\n'), 'text/csv;charset=utf-8')
}

export function exportLedgerJson(data: {
  receivables?: Receivable[]; receivableEvents?: unknown[]
  accounts: Account[]; transactions: Transaction[]; budgets: Budget[]; goals: Goal[];
  debts: Debt[]; upcomingExpenses: UpcomingExpense[]; expenseCategories: string[]; incomeCategories: string[]
}) {
  return download(
    `pocket-ledger-backup-${localDateKey()}.json`,
    JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), currency: 'PKR', timezone: 'Asia/Karachi', ...data }, null, 2),
    'application/json',
  )
}
