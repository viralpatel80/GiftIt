'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type MobileStep = 'phone' | 'otp' | 'link-email' | 'link-email-otp' | 'merge-confirm'

export default function LoginPage() {
  const [tab, setTab] = useState<'email' | 'mobile'>('email')

  // Email flow
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [emailStep, setEmailStep] = useState<'email' | 'otp'>('email')

  // Mobile flow
  const [phone, setPhone] = useState('')
  const [phoneOtp, setPhoneOtp] = useState('')
  const [mobileStep, setMobileStep] = useState<MobileStep>('phone')

  // Post-login email linking
  const [linkedEmail, setLinkedEmail] = useState('')
  const [linkedEmailOtp, setLinkedEmailOtp] = useState('')
  const [mergeTarget, setMergeTarget] = useState<{ name: string; handle: string } | null>(null)
  const [currentMobileUserId, setCurrentMobileUserId] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  // ── Email flow ──────────────────────────────────────────────
  async function sendOTP() {
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })
    if (error) { setError(error.message); setLoading(false); return }
    setEmailStep('otp'); setLoading(false)
  }

  async function verifyOTP() {
    setLoading(true); setError('')
    const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/dashboard')
  }

  async function handleGoogleSignIn() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
  }

  // ── Mobile flow ─────────────────────────────────────────────
  async function sendMobileOTP() {
    setLoading(true); setError('')
    const res = await fetch('/api/auth/whatsapp-otp/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phone.replace(/\D/g, '').slice(-10) }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    setMobileStep('otp'); setLoading(false)
  }

  async function verifyMobileOTP() {
    setLoading(true); setError('')
    const cleaned = phone.replace(/\D/g, '').slice(-10)

    // 1. Verify WhatsApp OTP
    const verifyRes = await fetch('/api/auth/whatsapp-otp/verify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: cleaned, otp: phoneOtp }),
    })
    const verifyData = await verifyRes.json()
    if (!verifyRes.ok) { setError(verifyData.error); setLoading(false); return }
    if (!verifyData.isExistingUser) {
      setError('No account found with this number. Please sign up first.')
      setLoading(false); return
    }

    // 2. Get magic link token for mobile user
    const loginRes = await fetch('/api/auth/mobile-login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: cleaned }),
    })
    const loginData = await loginRes.json()
    if (!loginRes.ok) { setError(loginData.error); setLoading(false); return }

    // 3. Set session
    const { error: otpError } = await supabase.auth.verifyOtp({
      token_hash: loginData.tokenHash,
      type: 'magiclink',
    })
    if (otpError) { setError(otpError.message); setLoading(false); return }

    // 4. Check if this account has a real email
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Session error'); setLoading(false); return }

    const { data: profile } = await supabase
      .from('users').select('email').eq('id', user.id).single()

    const hasSyntheticEmail = !profile?.email || profile.email.endsWith('@giftit.app')
    if (hasSyntheticEmail) {
      // Need to collect a real email
      setCurrentMobileUserId(user.id)
      setMobileStep('link-email')
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  // ── Post-login: link email ───────────────────────────────────
  async function checkLinkedEmail() {
    setLoading(true); setError('')
    const e = linkedEmail.trim().toLowerCase()
    if (!e.includes('@') || !e.includes('.')) {
      setError('Enter a valid email address'); setLoading(false); return
    }

    // Check if this email already belongs to another account
    const res = await fetch('/api/auth/check-exists', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: e }),
    })
    const { exists } = await res.json()

    if (!exists) {
      // Simple add: update current user's email
      const { error } = await supabase.auth.updateUser({ email: e })
      if (error) { setError(error.message); setLoading(false); return }
      setMobileStep('link-email-otp')
      setLoading(false)
      return
    }

    // Email exists elsewhere → check if we can merge
    const mergeRes = await fetch('/api/auth/merge-accounts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobileUserId: currentMobileUserId, email: e, confirm: false }),
    })
    const mergeData = await mergeRes.json()
    if (!mergeRes.ok) { setError(mergeData.error); setLoading(false); return }

    if (!mergeData.exists) {
      // Race condition — just add email
      const { error } = await supabase.auth.updateUser({ email: e })
      if (error) { setError(error.message); setLoading(false); return }
      setMobileStep('link-email-otp')
    } else {
      setMergeTarget({ name: mergeData.emailAccountName, handle: mergeData.emailAccountHandle })
      setMobileStep('merge-confirm')
    }
    setLoading(false)
  }

  async function verifyLinkedEmailOTP() {
    setLoading(true); setError('')
    const { error } = await supabase.auth.verifyOtp({
      email: linkedEmail.trim().toLowerCase(),
      token: linkedEmailOtp,
      type: 'email_change',
    })
    if (error) { setError(error.message); setLoading(false); return }
    // Also update public.users email field
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await supabase.from('users').update({ email: linkedEmail.trim().toLowerCase() }).eq('id', user.id)
    router.push('/dashboard')
  }

  async function confirmMerge() {
    setLoading(true); setError('')
    const e = linkedEmail.trim().toLowerCase()
    const mergeRes = await fetch('/api/auth/merge-accounts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobileUserId: currentMobileUserId, email: e, confirm: true }),
    })
    const mergeData = await mergeRes.json()
    if (!mergeRes.ok || !mergeData.merged) {
      setError(mergeData.error ?? 'Merge failed'); setLoading(false); return
    }

    // Sign in as the email account using the returned tokenHash
    const { error: signInErr } = await supabase.auth.verifyOtp({
      token_hash: mergeData.tokenHash,
      type: 'magiclink',
    })
    if (signInErr) { setError(signInErr.message); setLoading(false); return }
    router.push('/dashboard')
  }

  // ── Styles ───────────────────────────────────────────────────
  const inputStyle = {
    width: '100%', background: '#fff', border: '1px solid #E5E0D8',
    borderRadius: '8px', padding: '12px 16px', fontSize: '14px',
    color: '#1A1A1A', outline: 'none', boxSizing: 'border-box' as const,
  }
  const btnStyle = (dis: boolean) => ({
    width: '100%', background: dis ? '#E5E0D8' : '#C9A84C',
    color: dis ? '#AAA' : '#fff', fontWeight: 700, borderRadius: '8px',
    padding: '13px', fontSize: '14px', border: 'none',
    cursor: dis ? 'not-allowed' : 'pointer'
  } as const)
  const lbl = {
    display: 'block', fontSize: '11px', fontWeight: 700 as const, color: '#888',
    textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '8px'
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#F7F4F0' }}>
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-6" style={{ textDecoration: 'none' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base" style={{ background: '#C9A84C' }}>🎁</div>
            <span className="text-lg font-black tracking-tight" style={{ color: '#1A1A1A' }}>GiftIt</span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight mb-2" style={{ color: '#1A1A1A' }}>Welcome back</h1>
          <p className="text-sm" style={{ color: '#888' }}>Sign in to your account</p>
        </div>

        {/* Tabs — hide during post-login email steps */}
        {mobileStep === 'phone' || mobileStep === 'otp' ? (
          <div style={{ display: 'flex', background: '#fff', border: '1px solid #E5E0D8', borderRadius: '10px', padding: '4px', marginBottom: '16px', gap: '4px' }}>
            {(['email', 'mobile'] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); setError('') }}
                style={{ flex: 1, padding: '8px', borderRadius: '7px', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer', background: tab === t ? '#C9A84C' : 'transparent', color: tab === t ? '#fff' : '#888' }}>
                {t === 'email' ? '✉️ Email' : '📱 Mobile'}
              </button>
            ))}
          </div>
        ) : null}

        <div className="p-6 rounded-xl" style={{ background: '#fff', border: '1px solid #E5E0D8' }}>

          {/* ── EMAIL FLOW ── */}
          {tab === 'email' && emailStep === 'email' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <button onClick={handleGoogleSignIn} style={{ width: '100%', background: '#fff', border: '1px solid #E5E0D8', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: 600, color: '#1A1A1A', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Continue with Google
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 1, height: '1px', background: '#E5E0D8' }} />
                <span style={{ fontSize: '12px', color: '#AAA' }}>or</span>
                <div style={{ flex: 1, height: '1px', background: '#E5E0D8' }} />
              </div>
              <div>
                <label style={lbl}>Email address</label>
                <input type="email" placeholder="you@example.com" value={email}
                  onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendOTP()}
                  style={inputStyle} />
              </div>
              {error && <p style={{ color: '#e53e3e', fontSize: '12px' }}>{error}</p>}
              <button onClick={sendOTP} disabled={loading || !email.includes('@')} style={btnStyle(loading || !email.includes('@'))}>
                {loading ? 'Sending...' : 'Send Code →'}
              </button>
            </div>
          )}

          {tab === 'email' && emailStep === 'otp' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={lbl}>6-digit code</label>
                <p style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>Sent to {email}</p>
                <input type="text" maxLength={6} placeholder="000000" value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={e => e.key === 'Enter' && verifyOTP()}
                  style={{ ...inputStyle, textAlign: 'center', fontSize: '22px', letterSpacing: '0.3em', fontFamily: 'monospace' }} />
              </div>
              {error && <p style={{ color: '#e53e3e', fontSize: '12px' }}>{error}</p>}
              <button onClick={verifyOTP} disabled={loading || otp.length < 6} style={btnStyle(loading || otp.length < 6)}>
                {loading ? 'Verifying...' : 'Sign In →'}
              </button>
              <button onClick={() => setEmailStep('email')} style={{ fontSize: '12px', color: '#888', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center' }}>← Change email</button>
            </div>
          )}

          {/* ── MOBILE FLOW — phone entry ── */}
          {tab === 'mobile' && mobileStep === 'phone' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={lbl}>Mobile Number</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ background: '#F7F4F0', border: '1px solid #E5E0D8', borderRadius: '8px', padding: '12px 14px', fontSize: '14px', color: '#888', flexShrink: 0 }}>+91</div>
                  <input type="tel" placeholder="9876543210" value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    onKeyDown={e => e.key === 'Enter' && sendMobileOTP()}
                    style={inputStyle} />
                </div>
              </div>
              {error && <p style={{ color: '#e53e3e', fontSize: '12px' }}>{error}</p>}
              <button onClick={sendMobileOTP} disabled={loading || phone.length < 10} style={btnStyle(loading || phone.length < 10)}>
                {loading ? 'Sending...' : 'Send WhatsApp Code →'}
              </button>
            </div>
          )}

          {/* ── MOBILE FLOW — OTP entry ── */}
          {tab === 'mobile' && mobileStep === 'otp' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={lbl}>WhatsApp Code</label>
                <p style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>Sent to +91 {phone} via WhatsApp</p>
                <input type="text" maxLength={6} placeholder="000000" value={phoneOtp}
                  onChange={e => setPhoneOtp(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={e => e.key === 'Enter' && verifyMobileOTP()}
                  style={{ ...inputStyle, textAlign: 'center', fontSize: '22px', letterSpacing: '0.3em', fontFamily: 'monospace' }} />
              </div>
              {error && <p style={{ color: '#e53e3e', fontSize: '12px' }}>{error}</p>}
              <button onClick={verifyMobileOTP} disabled={loading || phoneOtp.length < 6} style={btnStyle(loading || phoneOtp.length < 6)}>
                {loading ? 'Signing in...' : 'Sign In →'}
              </button>
              <button onClick={() => setMobileStep('phone')} style={{ fontSize: '12px', color: '#888', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center' }}>← Change number</button>
            </div>
          )}

          {/* ── POST-LOGIN: Add email ── */}
          {mobileStep === 'link-email' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ textAlign: 'center', marginBottom: '4px' }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>✉️</div>
                <p style={{ fontSize: '15px', fontWeight: 700, color: '#1A1A1A', margin: '0 0 6px' }}>Add your email address</p>
                <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>Your account doesn't have an email yet. Add one to secure your account.</p>
              </div>
              <div>
                <label style={lbl}>Email address</label>
                <input type="email" placeholder="you@example.com" value={linkedEmail}
                  onChange={e => setLinkedEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && checkLinkedEmail()}
                  style={inputStyle} />
              </div>
              {error && <p style={{ color: '#e53e3e', fontSize: '12px' }}>{error}</p>}
              <button onClick={checkLinkedEmail} disabled={loading || !linkedEmail.includes('@')} style={btnStyle(loading || !linkedEmail.includes('@'))}>
                {loading ? 'Checking...' : 'Continue →'}
              </button>
              <button onClick={() => router.push('/dashboard')} style={{ fontSize: '12px', color: '#888', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center' }}>
                Skip for now →
              </button>
            </div>
          )}

          {/* ── POST-LOGIN: Verify email OTP ── */}
          {mobileStep === 'link-email-otp' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={lbl}>Verification Code</label>
                <p style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>Sent to {linkedEmail}</p>
                <input type="text" maxLength={6} placeholder="000000" value={linkedEmailOtp}
                  onChange={e => setLinkedEmailOtp(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={e => e.key === 'Enter' && verifyLinkedEmailOTP()}
                  style={{ ...inputStyle, textAlign: 'center', fontSize: '22px', letterSpacing: '0.3em', fontFamily: 'monospace' }} />
              </div>
              {error && <p style={{ color: '#e53e3e', fontSize: '12px' }}>{error}</p>}
              <button onClick={verifyLinkedEmailOTP} disabled={loading || linkedEmailOtp.length < 6} style={btnStyle(loading || linkedEmailOtp.length < 6)}>
                {loading ? 'Verifying...' : 'Verify & Continue →'}
              </button>
              <button onClick={() => { setMobileStep('link-email'); setLinkedEmailOtp('') }} style={{ fontSize: '12px', color: '#888', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center' }}>← Change email</button>
            </div>
          )}

          {/* ── POST-LOGIN: Merge confirmation ── */}
          {mobileStep === 'merge-confirm' && mergeTarget && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ textAlign: 'center', marginBottom: '4px' }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>🔗</div>
                <p style={{ fontSize: '15px', fontWeight: 700, color: '#1A1A1A', margin: '0 0 6px' }}>Account already exists</p>
                <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
                  <strong>{linkedEmail}</strong> is already linked to an existing GiftIt account.
                </p>
              </div>

              {/* Existing account card */}
              <div style={{ background: '#F7F4F0', border: '1px solid #E5E0D8', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#C9A84C', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '16px' }}>
                  {mergeTarget.name?.[0]}
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#1A1A1A', margin: '0 0 2px' }}>{mergeTarget.name}</p>
                  <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>@{mergeTarget.handle}</p>
                </div>
              </div>

              {/* What happens info */}
              <div style={{ background: '#FFF8E7', border: '1px solid #F0D060', borderRadius: '10px', padding: '12px 14px' }}>
                <p style={{ fontSize: '12px', fontWeight: 700, color: '#7A5C00', margin: '0 0 6px' }}>What happens when you link:</p>
                <p style={{ fontSize: '12px', color: '#9A7020', margin: '0 0 4px' }}>✓ Your phone number gets added to this account</p>
                <p style={{ fontSize: '12px', color: '#9A7020', margin: '0 0 4px' }}>✓ Your wallet balance & events are moved across</p>
                <p style={{ fontSize: '12px', color: '#9A7020', margin: 0 }}>✓ Your mobile-only GiftIt ID is removed</p>
              </div>

              {error && <p style={{ color: '#e53e3e', fontSize: '12px' }}>{error}</p>}

              <button onClick={confirmMerge} disabled={loading} style={btnStyle(loading)}>
                {loading ? 'Linking accounts...' : `Link to @${mergeTarget.handle}'s account →`}
              </button>
              <button onClick={() => { setMobileStep('link-email'); setLinkedEmail(''); setMergeTarget(null) }}
                style={{ fontSize: '12px', color: '#888', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center' }}>
                ← Use a different email
              </button>
            </div>
          )}

        </div>

        {(mobileStep === 'phone' || mobileStep === 'otp' || tab === 'email') && (
          <p className="text-center text-xs mt-6" style={{ color: '#888' }}>
            New to GiftIt?{' '}
            <Link href="/signup" style={{ color: '#C9A84C', fontWeight: 600 }}>Create account</Link>
          </p>
        )}
      </div>
    </div>
  )
}
