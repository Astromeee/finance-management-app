import { Turnstile } from '@marsidev/react-turnstile'
import { ArrowLeft, CheckCircle2, Eye, EyeOff } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { passwordRequirements, passwordValidationMessage } from '../lib/password'
import { supabase } from '../lib/supabase'

type AuthMode = 'login' | 'signup' | 'forgot' | 'reset'

export function AuthPage({ mode }: { mode: AuthMode }) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [captchaToken, setCaptchaToken] = useState<string>()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)
  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined
  const signupEnabled = import.meta.env.VITE_PUBLIC_SIGNUP_ENABLED === 'true'
  const googleEnabled = import.meta.env.VITE_GOOGLE_AUTH_ENABLED === 'true'

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase) return setMessage('Supabase is not configured.')
    if (mode === 'signup' && !signupEnabled) return setMessage('Public signup is not open yet.')
    if ((mode === 'signup' || mode === 'reset') && password !== confirmPassword) return setMessage('Passwords do not match.')
    if (mode === 'signup' || mode === 'reset') {
      const validationMessage = passwordValidationMessage(password)
      if (validationMessage) return setMessage(validationMessage)
    }
    if (turnstileSiteKey && mode !== 'reset' && !captchaToken) return setMessage('Complete the security check first.')
    setLoading(true)
    setMessage('')
    setSuccess(false)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password, options: { captchaToken } })
        if (error) throw error
        navigate('/app', { replace: true })
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email: email.trim(), password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback`, captchaToken },
        })
        if (error) throw error
        setSuccess(true)
        setMessage('Check your email to verify your account, then return to Pocket Ledger.')
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`, captchaToken,
        })
        if (error) throw error
        setSuccess(true)
        setMessage('If an account exists for that email, a reset link is on its way.')
      } else {
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw error
        setSuccess(true)
        setMessage('Password updated. You can continue to Pocket Ledger.')
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Authentication failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const google = async () => {
    if (!supabase) return
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      setMessage(error.message)
      setLoading(false)
    }
  }

  const copy = {
    login: ['Welcome back', 'Log in to your private finance ledger.'],
    signup: ['Create your ledger', 'Pakistan-first money tracking, with your data kept private.'],
    forgot: ['Reset your password', 'We will send a secure reset link to your email.'],
    reset: ['Choose a new password', 'Use a strong password you do not use elsewhere.'],
  }[mode]

  if (mode === 'signup' && !signupEnabled) {
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--bg-deep)] p-5">
        <section className="w-full max-w-md rounded-[2rem] border border-[var(--glass-border)] bg-[var(--surface)] p-6 text-center shadow-2xl shadow-black/35">
          <img className="mx-auto h-16 w-16 rounded-[20px]" src="/pocket-ledger-icon.png" alt="" aria-hidden="true" />
          <p className="mt-5 text-xs font-semibold uppercase tracking-[.18em] text-[var(--muted)]">Pocket Ledger · Private Beta</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Signup is not open yet</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">We are finishing authentication, email delivery, and security checks before accepting public accounts.</p>
          <Link className="btn-primary mt-6 justify-center" to="/login">Back to login</Link>
        </section>
      </main>
    )
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--bg-deep)] p-5">
      <section className="w-full max-w-md rounded-[2rem] border border-[var(--glass-border)] bg-[var(--surface)] p-6 shadow-2xl shadow-black/35">
        {(mode === 'forgot' || mode === 'reset') && <Link className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--muted)]" to="/login"><ArrowLeft size={17} /> Back to login</Link>}
        <img className="mx-auto h-16 w-16 rounded-[20px]" src="/pocket-ledger-icon.png" alt="" aria-hidden="true" />
        <div className="mt-5 text-center">
          <div className="flex items-center justify-center gap-2"><p className="text-xs font-semibold uppercase tracking-[.18em] text-[var(--muted)]">Pocket Ledger</p><span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--accent)]">PUBLIC BETA</span></div>
          <h1 className="mt-2 text-3xl font-semibold text-white">{copy[0]}</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">{copy[1]}</p>
        </div>

        {googleEnabled && (mode === 'login' || mode === 'signup') && <button className="mt-6 flex min-h-12 w-full items-center justify-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] text-sm font-semibold text-white disabled:opacity-60" disabled={loading} onClick={google}><img className="h-5 w-5 object-contain" src="/google-g.png" alt="" aria-hidden="true" />Continue with Google</button>}
        {googleEnabled && (mode === 'login' || mode === 'signup') && <div className="my-4 flex items-center gap-3 text-xs text-[var(--muted-2)]"><span className="h-px flex-1 bg-[var(--border)]" />or use email<span className="h-px flex-1 bg-[var(--border)]" /></div>}

        <form className="grid gap-4" onSubmit={submit}>
          {mode !== 'reset' && <label><span className="form-label">Email address</span><input autoComplete="email" className="form-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /></label>}
          {(mode === 'login' || mode === 'signup' || mode === 'reset') && <label><span className="form-label">Password</span><span className="relative block"><input autoComplete={mode === 'login' ? 'current-password' : 'new-password'} className="form-input pr-12" minLength={mode === 'login' ? undefined : 12} type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} required /><button aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute inset-y-0 right-1 grid w-11 place-items-center text-[var(--muted)]" type="button" onClick={() => setShowPassword((current) => !current)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span>{(mode === 'signup' || mode === 'reset') && <span className="mt-2 block text-xs leading-5 text-[var(--muted-2)]">{passwordRequirements}</span>}</label>}
          {(mode === 'signup' || mode === 'reset') && <label><span className="form-label">Confirm password</span><input autoComplete="new-password" className="form-input" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></label>}
          {turnstileSiteKey && mode !== 'reset' && <Turnstile onExpire={() => setCaptchaToken(undefined)} onSuccess={setCaptchaToken} siteKey={turnstileSiteKey} />}
          <button className="btn-primary justify-center disabled:opacity-60" disabled={loading || Boolean(turnstileSiteKey && mode !== 'reset' && !captchaToken)}>{loading ? 'Please wait…' : mode === 'login' ? 'Log in' : mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : 'Update password'}</button>
          {message && <p className={`rounded-2xl border p-3 text-sm ${success ? 'border-[rgba(45,157,120,.3)] bg-[rgba(45,157,120,.1)] text-[var(--positive)]' : 'border-[rgba(232,105,74,.25)] bg-[rgba(232,105,74,.08)] text-[var(--negative)]'}`} role="status">{success && <CheckCircle2 className="mr-2 inline" size={16} />}{message}</p>}
        </form>

        {mode === 'login' && <div className="mt-5 flex items-center justify-between text-sm"><Link className="text-[var(--muted)]" to="/forgot-password">Forgot password?</Link>{signupEnabled && <Link className="font-semibold text-[var(--accent)]" to="/signup">Create account</Link>}</div>}
        {mode === 'signup' && <p className="mt-5 text-center text-sm text-[var(--muted)]">Already have an account? <Link className="font-semibold text-[var(--accent)]" to="/login">Log in</Link></p>}
        <p className="mt-6 text-center text-xs leading-5 text-[var(--muted-2)]">By continuing, you agree to the <Link className="underline" to="/terms">Terms</Link> and acknowledge the <Link className="underline" to="/privacy">Privacy Policy</Link>.</p>
      </section>
    </main>
  )
}

export function AuthCallback() {
  return <main className="grid min-h-screen place-items-center bg-[var(--bg-deep)] p-5"><p className="text-sm font-semibold text-[var(--muted)]" role="status">Completing secure sign-in…</p></main>
}
