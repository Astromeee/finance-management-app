import { Component, type ErrorInfo, type ReactNode } from 'react'
import { reportClientError } from '../lib/errorMonitoring'

type Props = { children: ReactNode }
type State = { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep finance content out of diagnostics. Only structural error details are logged.
    console.error('Pocket Ledger render failure', { name: error.name, message: error.message, componentStack: info.componentStack })
    void reportClientError('render_failure', error)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--bg-deep)] p-5">
        <section className="card max-w-md p-6 text-center" role="alert">
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-[var(--accent)]">Something went wrong</p>
          <h1 className="mt-2 text-2xl font-semibold text-white">Pocket Ledger could not open this screen.</h1>
          <p className="mt-3 text-sm text-[var(--muted)]">Your saved data has not been changed. Reload the app to try again.</p>
          <button className="btn-primary mt-5 justify-center" onClick={() => window.location.reload()}>Reload Pocket Ledger</button>
        </section>
      </main>
    )
  }
}
