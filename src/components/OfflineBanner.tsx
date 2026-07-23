import { useEffect, useState } from 'react'

export function OfflineBanner() {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])
  if (online) return null
  return <div className="fixed inset-x-3 top-3 z-[80] rounded-2xl bg-[var(--negative)] px-4 py-3 text-center text-sm font-semibold text-[var(--ink)] shadow-xl" role="status">You are offline. Pocket Ledger is read-only until the connection returns.</div>
}
