import { Turnstile } from '@marsidev/react-turnstile'
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthShell } from '../components/auth/AuthShell'
import { BrandLockup } from '../components/auth/BrandLockup'
import { LoginShowcase } from '../components/auth/LoginShowcase'
import { passwordRequirements, passwordValidationMessage } from '../lib/password'
import { supabase } from '../lib/supabase'

function LoginPanel() {
  return <>
    <p className="ao-kicker">A look inside</p>
    <h2 className="ao-headline">See where your money <em>goes.</em></h2>
    <p className="ao-support">Five real screens from the app. Here is how each one quietly makes managing money easier.</p>
    <LoginShowcase />
  </>
}

type AuthMode = 'login' | 'signup' | 'forgot' | 'reset'

export function AuthPage({ mode }: { mode: AuthMode }) {
  const navigate = useNavigate()
  const [name, setName] = useState('')
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
          options: {
            data: { display_name: name.trim() },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            captchaToken,
          },
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
    login: { kicker: 'Welcome back', lead: 'Good to see you', accent: 'again.', support: 'Your safe-to-spend is already counted and waiting for today.', cta: 'Log in to Pocket Ledger' },
    signup: { kicker: 'Create your ledger', lead: 'Start knowing what is', accent: 'safe to spend.', support: 'Pakistan-first money tracking, with your data kept private to your account.', cta: 'Create account' },
    forgot: { kicker: 'Reset your password', lead: 'Let us get you back', accent: 'in.', support: 'We will send a secure reset link to your email.', cta: 'Send reset link' },
    reset: { kicker: 'New password', lead: 'Choose something', accent: 'only you know.', support: 'Use a strong password you do not use anywhere else.', cta: 'Update password' },
  }[mode]

  const showProviders = googleEnabled && (mode === 'login' || mode === 'signup')

  if (mode === 'signup' && !signupEnabled) {
    return (
      <AuthShell variant="login" panel={<LoginPanel />}>
        <div className="ao-stack">
          <BrandLockup />
          <div>
            <p className="ao-kicker">Pocket Ledger, private beta</p>
            <h1 className="ao-headline">Signup is not <em>open yet.</em></h1>
            <p className="ao-support">We are finishing authentication, email delivery, and security checks before accepting public accounts.</p>
          </div>
          <Link className="ao-cta is-ink" to="/login">Back to login</Link>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell variant="login" panel={<LoginPanel />}>
      <div className="ao-stack">
        <BrandLockup />
        <div>
          <p className="ao-kicker">{copy.kicker}</p>
          <h1 className="ao-headline">{copy.lead} <em>{copy.accent}</em></h1>
          <p className="ao-support">{copy.support}</p>
        </div>

        {showProviders && <button className="ao-cta is-ink" disabled={loading} onClick={google} type="button"><img className="h-5 w-5 object-contain" src="/google-g.png" alt="" aria-hidden="true" />Continue with Google</button>}
        {showProviders && <p className="ao-divider">or use email</p>}

        <form className="ao-stack" onSubmit={submit}>
          {mode === 'signup' && <label className="ao-field"><span className="ao-label">Your name</span><input autoComplete="name" className="ao-input" maxLength={80} minLength={2} type="text" value={name} onChange={(event) => setName(event.target.value)} placeholder="How should we greet you?" required /></label>}
          {mode !== 'reset' && <label className="ao-field"><span className="ao-label">Email address</span><input autoComplete="email" className="ao-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /></label>}
          {(mode === 'login' || mode === 'signup' || mode === 'reset') && <label className="ao-field">
            <span className="ao-label">Password</span>
            <span className="ao-password-wrap">
              <input autoComplete={mode === 'login' ? 'current-password' : 'new-password'} className="ao-input" minLength={mode === 'login' ? undefined : 6} type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} required />
              <button aria-label={showPassword ? 'Hide password' : 'Show password'} className="ao-password-toggle" type="button" onClick={() => setShowPassword((current) => !current)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
            </span>
            {(mode === 'signup' || mode === 'reset') && <span className="mt-2 block text-xs leading-5 text-[var(--taupe)]">{passwordRequirements}</span>}
          </label>}
          {(mode === 'signup' || mode === 'reset') && <label className="ao-field"><span className="ao-label">Confirm password</span><input autoComplete="new-password" className="ao-input" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></label>}
          {turnstileSiteKey && mode !== 'reset' && !captchaToken && (
            <div className="w-full overflow-hidden rounded-2xl">
              <Turnstile
                options={{ appearance: 'interaction-only', size: 'flexible', theme: 'light' }}
                onExpire={() => setCaptchaToken(undefined)}
                onSuccess={setCaptchaToken}
                siteKey={turnstileSiteKey}
              />
            </div>
          )}
          <button className="ao-cta" disabled={loading || Boolean(turnstileSiteKey && mode !== 'reset' && !captchaToken)}>{loading ? 'Please wait…' : copy.cta}{!loading && <ArrowRight size={18} />}</button>
          {message && <p className="ao-message" role="status">{success && <CheckCircle2 className="mr-2 inline" size={16} />}{message}</p>}
        </form>

        {mode === 'login' && <div className="ao-login-links">
          <Link className="ao-inline-link" to="/forgot-password">Forgot password?</Link>
          {signupEnabled && <Link className="ao-inline-link" to="/signup">Create an account</Link>}
        </div>}
        {mode === 'signup' && <p className="text-center text-sm text-[var(--taupe)]">Already have an account? <Link className="ao-inline-link" to="/login">Log in</Link></p>}
        {(mode === 'forgot' || mode === 'reset') && <Link className="ao-inline-link" to="/login"><ArrowLeft className="mr-1 inline" size={15} />Back to login</Link>}
        <p className="ao-fineprint">Free while in beta, your data stays yours. <Link to="/terms">Terms</Link> · <Link to="/privacy">Privacy</Link></p>
      </div>
    </AuthShell>
  )
}

export function AuthCallback() {
  const navigate = useNavigate()
  const [errorMessage, setErrorMessage] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    return params.get('error_description') ?? hashParams.get('error_description') ?? params.get('error') ?? hashParams.get('error') ?? ''
  })
  const effectiveError = errorMessage || (!supabase ? 'Secure sign-in is not configured.' : '')

  useEffect(() => {
    if (effectiveError || !supabase) return

    let mounted = true
    let timeoutId: number | undefined
    const finish = () => navigate('/app', { replace: true })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) finish()
    })

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return
      if (error) {
        setErrorMessage(error.message)
      } else if (data.session?.user) {
        finish()
      } else {
        timeoutId = window.setTimeout(() => {
          if (mounted) setErrorMessage('We could not finish sign-in. Please return to login and try again.')
        }, 5000)
      }
    })

    return () => {
      mounted = false
      if (timeoutId) window.clearTimeout(timeoutId)
      listener.subscription.unsubscribe()
    }
  }, [effectiveError, navigate])

  return (
    <AuthShell variant="login" panel={<LoginPanel />}>
      <div className="ao-stack">
        <BrandLockup />
        {effectiveError ? <>
          <div>
            <p className="ao-kicker">Sign-in</p>
            <h1 className="ao-headline">We could not finish <em>signing you in.</em></h1>
            <p className="ao-support" role="alert">{effectiveError}</p>
          </div>
          <Link className="ao-cta" to="/login">Back to login</Link>
        </> : <p className="ao-support" role="status">Completing secure sign-in…</p>}
      </div>
    </AuthShell>
  )
}
