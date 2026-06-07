import { BookOpen, Database, Download, Moon, Upload } from 'lucide-react'

export function Settings() {
  const items = [
    ['Currency', 'PKR / Rs.', Moon],
    ['Theme', 'Dark mode selected', Moon],
    ['Manage categories', 'Income sources and expense groups', BookOpen],
    ['Manage accounts', 'Cash, banks, and wallets', Database],
    ['Export data', 'Placeholder for CSV/XLSX export', Download],
    ['Import bank statement', 'Placeholder for future import flow', Upload],
    ['Supabase connection', 'Not connected yet', Database],
    ['Documentation', 'See /docs for product notes', BookOpen],
  ] as const

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map(([title, detail, Icon]) => (
        <article key={title} className="card flex items-center gap-4">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--surface-2)] text-[var(--accent)]"><Icon size={21} /></span>
          <div><h3 className="font-semibold text-white">{title}</h3><p className="mt-1 text-sm text-[var(--muted)]">{detail}</p></div>
        </article>
      ))}
    </div>
  )
}
