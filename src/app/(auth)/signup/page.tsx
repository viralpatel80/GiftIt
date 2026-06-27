'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type EmailStep = 'email' | 'otp' | 'profile' | 'phone' | 'phone_otp'
type MobileStep = 'phone' | 'phone_otp'

export default function SignupPage() {
  const [tab, setTab] = useState<'email' | 'mobile'>('email')

  // Email flow state
  const [emailStep, setEmailStep] = useState<EmailStep>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [name, setName] = useState('')
  const [handle, setHandle] = useState('')
  const [handleAvail, setHandleAvail] = useState<boolean | null>(null)
  const [phone, setPhone] = useState('')
  const [phoneOtp, setPhoneOtp] = useState('')

  // Mobile flow state
  const [mobileStep, setMobileStep] = useState<MobileStep>('phone')
  const [mobilePhone, setMobilePhone] = useState('')
  const [mobileOtp, setMobileOtp] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  // ── Email flow ──────────────────────────────────────────────
  async function sendEmailOTP() {
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })
    if (error) { setError(error.message); setLoading(false); return }
    setEmailStep('otp'); setLoading(false)
  }

  async function verifyEmailOTP() {
    setLoading(true); setError('')
    const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' })
    if (error) { setError(error.message); setLoading(false); return }
    setEmailStep('profile'); setLoading(false)
  }

  async function checkHandle(h: string) {
    setHandle(h)
    if (h.length < 3) { setHandleAvail(null); return }
    const { data } = await supabase.from('users').select('id').eq('gift_handle', h).single()
    setHandleAvail(!data)
  }

  async function saveProfile() {
    setLoading(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Session expired.'); setLoading(false); return }
    const { error } = await supabase.from('users').upsert({
      id: user.id, email: user.email, full_name: name,
      gift_handle: handle.toLowerCase().replace(/\s/g, '.'),
      gift_numeric_id: 'GIFT-' + Math.floor(1000 + Math.random() * 9000) + '-' + Math.floor(1000 + Math.random() * 9000)
    })
    if (error) { setError(error.message); setLoading(false); return }
    await supabase.from('wallet_transactions').insert({
      user_id: user.id, type: 'credit_event', amount: 5000,
      description: '🎉 Welcome to GiftIt! ₹5,000 gift credit added to your wallet'
    })
    setEmailStep('phone'); setLoading(false)
  }

  async function sendPhoneOTP() {
    setLoading(true); setError('')
    const res = await fetch('/api/auth/whatsapp-otp/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phone.replace(/\D/g, '').slice(-10) }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    setEmailStep('phone_otp'); setLoading(false)
  }

  async function verifyPhoneOTP() {
    setLoading(true); setError('')
    const cleaned = phone.replace(/\D/g, '').slice(-10)
    const res = await fetch('/api/auth/whatsapp-otp/verify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: cleaned, otp: phoneOtp }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }

    // Save phone to user profile
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('users').update({ phone: cleaned, phone_verified: true }).eq('id', user.id)
    }
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
      body: JSON.stringify({ phone: mobilePhone.replace(/\D/g, '').slice(-10) }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    setMobileStep('phone_otp'); setLoading(false)
  }

  async function verifyMobileOTP() {
    setLoading(true); setError('')
    const cleaned = mobilePhone.replace(/\D/g, '').slice(-10)

    // 1. Verify WhatsApp OTP
    const verifyRes = await fetch('/api/auth/whatsapp-otp/verify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: cleaned, otp: mobileOtp }),
    })
    const verifyData = await verifyRes.json()
    if (!verifyRes.ok) { setError(verifyData.error); setLoading(false); return }

    // 2. Create/find user, get token hash
    const signupRes = await fetch('/api/auth/mobile-signup', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: cleaned }),
    })
    const signupData = await signupRes.json()
    if (!signupRes.ok) { setError(signupData.error); setLoading(false); return }

    // 3. Set session directly via token_hash (no PKCE / redirect needed)
    const { data, error: otpError } = await supabase.auth.verifyOtp({
      token_hash: signupData.tokenHash,
      type: 'magiclink',
    })
    if (otpError || !data.user) { setError(otpError?.message || 'Login failed'); setLoading(false); return }

    // 4. New user: create profile + wallet, go to profile/complete
    if (signupData.isNew) {
      await supabase.from('users').insert({
        id: data.user.id,
        email: data.user.email,
        phone: cleaned,
        phone_verified: true,
        gift_handle: 'user_' + data.user.id.substring(0, 8),
        gift_numeric_id: 'GIFT-' + Math.floor(1000 + Math.random() * 9000) + '-' + Math.floor(1000 + Math.random() * 9000),
      })
      await supabase.from('wallet_transactions').insert({
        user_id: data.user.id, type: 'credit_event', amount: 5000,
        description: '🎉 Welcome to GiftIt! ₹5,000 gift credit added to your wallet',
      })
      router.push('/profile/complete?phone=' + cleaned)
    } else {
      router.push('/dashboard')
    }
  }

  // ── Styles ───────────────────────────────────────────────────
  const inputStyle = {
    width: '100%', background: '#fff', border: '1px solid #E5E0D8',
    borderRadius: '8px', padding: '12px 16px', fontSize: '14px',
    color: '#1A1A1A', outline: 'none', boxSizing: 'border-box' as const,
  }
  const labelStyle = {
    display: 'block', fontSize: '11px', fontWeight: 700 as const, color: '#888',
    textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '8px'
  }
  const btnStyle = (dis: boolean) => ({
    width: '100%', background: dis ? '#E5E0D8' : '#C9A84C',
    color: dis ? '#AAA' : '#fff', fontWeight: 700, borderRadius: '8px',
    padding: '13px', fontSize: '14px', border: 'none',
    cursor: dis ? 'not-allowed' : 'pointer'
  } as const)

  const steps = tab === 'email'
    ? ['email', 'otp', 'profile', 'phone', 'phone_otp']
    : ['phone', 'phone_otp']
  const currentStep = tab === 'email' ? emailStep : mobileStep
  const stepIndex = steps.indexOf(currentStep)

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#F7F4F0' }}>
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-6" style={{ textDecoration: 'none' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base" style={{ background: '#C9A84C' }}>🎁</div>
            <span className="text-lg font-black tracking-tight" style={{ color: '#1A1A1A' }}>GiftIt</span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight mb-2" style={{ color: '#1A1A1A' }}>Create your account</h1>
        </div>

        {/* Progress bar */}
        <div className="flex gap-2 mb-6">
          {steps.map((_, i) => (
            <div key={i} className="h-1 flex-1 rounded-full" style={{ background: i <= stepIndex ? '#C9A84C' : '#E5E0D8' }} />
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: '#fff', border: '1px solid #E5E0D8', borderRadius: '10px', padding: '4px', marginBottom: '16px', gap: '4px' }}>
            {(['email', 'mobile'] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); setError('') }}
                style={{
                  flex: 1, padding: '8px', borderRadius: '7px', fontSize: '13px', fontWeight: 600,
                  border: 'none', cursor: 'pointer',
                  background: tab === t ? '#C9A84C' : 'transparent',
                  color: tab === t ? '#fff' : '#888'
                }}>
                {t === 'email' ? '✉️ Email' : '📱 Mobile'}
              </button>
            ))}
        </div>

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
                <label style={labelStyle}>Email address</label>
                <input type="email" placeholder="you@example.com" value={email}
                  onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendEmailOTP()}
                  style={inputStyle} />
              </div>
              {error && <p style={{ color: '#e53e3e', fontSize: '12px' }}>{error}</p>}
              <button onClick={sendEmailOTP} disabled={loading || !email.includes('@')} style={btnStyle(loading || !email.includes('@'))}>
                {loading ? 'Sending...' : 'Send Code →'}
              </button>
            </div>
          )}

          {tab === 'email' && emailStep === 'otp' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>6-digit code</label>
                <p style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>Sent to {email}</p>
                <input type="text" maxLength={6} placeholder="000000" value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={e => e.key === 'Enter' && verifyEmailOTP()}
                  style={{ ...inputStyle, textAlign: 'center', fontSize: '22px', letterSpacing: '0.3em', fontFamily: 'monospace' }} />
              </div>
              {error && <p style={{ color: '#e53e3e', fontSize: '12px' }}>{error}</p>}
              <button onClick={verifyEmailOTP} disabled={loading || otp.length < 6} style={btnStyle(loading || otp.length < 6)}>
                {loading ? 'Verifying...' : 'Verify Code →'}
              </button>
              <button onClick={() => setEmailStep('email')} style={{ fontSize: '12px', color: '#888', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center' }}>← Change email</button>
            </div>
          )}

          {tab === 'email' && emailStep === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Full Name</label>
                <input type="text" placeholder="Priya Kapoor" value={name}
                  onChange={e => setName(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>@handle — your GiftID</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#888', fontSize: '14px' }}>@</span>
                  <input type="text" placeholder="priya.kapoor" value={handle}
                    onChange={e => checkHandle(e.target.value)}
                    style={{ ...inputStyle, paddingLeft: '30px' }} />
                  {handleAvail !== null && (
                    <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', fontWeight: 600, color: handleAvail ? '#38a169' : '#e53e3e' }}>
                      {handleAvail ? '✓ Available' : '✗ Taken'}
                    </span>
                  )}
                </div>
              </div>
              {error && <p style={{ color: '#e53e3e', fontSize: '12px' }}>{error}</p>}
              <button onClick={saveProfile} disabled={loading || !name || !handle || handleAvail === false}
                style={btnStyle(loading || !name || !handle || handleAvail === false)}>
                {loading ? 'Saving...' : 'Next →'}
              </button>
            </div>
          )}

          {tab === 'email' && emailStep === 'phone' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ textAlign: 'center', fontSize: '32px', marginBottom: '4px' }}>📱</div>
              <div>
                <label style={labelStyle}>Mobile Number</label>
                <p style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>We&apos;ll send a code via WhatsApp to verify</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ background: '#F7F4F0', border: '1px solid #E5E0D8', borderRadius: '8px', padding: '12px 14px', fontSize: '14px', color: '#888', flexShrink: 0 }}>+91</div>
                  <input type="tel" placeholder="9876543210" value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    onKeyDown={e => e.key === 'Enter' && sendPhoneOTP()}
                    style={{ ...inputStyle }} />
                </div>
              </div>
              {error && <p style={{ color: '#e53e3e', fontSize: '12px' }}>{error}</p>}
              <button onClick={sendPhoneOTP} disabled={loading || phone.length < 10} style={btnStyle(loading || phone.length < 10)}>
                {loading ? 'Sending...' : 'Send WhatsApp Code →'}
              </button>
            </div>
          )}

          {tab === 'email' && emailStep === 'phone_otp' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>WhatsApp Code</label>
                <p style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>Sent to +91 {phone} via WhatsApp</p>
                <input type="text" maxLength={6} placeholder="000000" value={phoneOtp}
                  onChange={e => setPhoneOtp(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={e => e.key === 'Enter' && verifyPhoneOTP()}
                  style={{ ...inputStyle, textAlign: 'center', fontSize: '22px', letterSpacing: '0.3em', fontFamily: 'monospace' }} />
              </div>
              {error && <p style={{ color: '#e53e3e', fontSize: '12px' }}>{error}</p>}
              <button onClick={verifyPhoneOTP} disabled={loading || phoneOtp.length < 6} style={btnStyle(loading || phoneOtp.length < 6)}>
                {loading ? 'Verifying...' : 'Verify & Finish →'}
              </button>
              <button onClick={() => setEmailStep('phone')} style={{ fontSize: '12px', color: '#888', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center' }}>← Change number</button>
            </div>
          )}

          {/* ── MOBILE FLOW ── */}
          {tab === 'mobile' && mobileStep === 'phone' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Mobile Number</label>
                <p style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>You&apos;ll get a code on WhatsApp</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ background: '#F7F4F0', border: '1px solid #E5E0D8', borderRadius: '8px', padding: '12px 14px', fontSize: '14px', color: '#888', flexShrink: 0 }}>+91</div>
                  <input type="tel" placeholder="9876543210" value={mobilePhone}
                    onChange={e => setMobilePhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    onKeyDown={e => e.key === 'Enter' && sendMobileOTP()}
                    style={inputStyle} />
                </div>
              </div>
              {error && <p style={{ color: '#e53e3e', fontSize: '12px' }}>{error}</p>}
              <button onClick={sendMobileOTP} disabled={loading || mobilePhone.length < 10} style={btnStyle(loading || mobilePhone.length < 10)}>
                {loading ? 'Sending...' : 'Send WhatsApp Code →'}
              </button>
            </div>
          )}

          {tab === 'mobile' && mobileStep === 'phone_otp' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>WhatsApp Code</label>
                <p style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>Sent to +91 {mobilePhone} via WhatsApp</p>
                <input type="text" maxLength={6} placeholder="000000" value={mobileOtp}
                  onChange={e => setMobileOtp(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={e => e.key === 'Enter' && verifyMobileOTP()}
                  style={{ ...inputStyle, textAlign: 'center', fontSize: '22px', letterSpacing: '0.3em', fontFamily: 'monospace' }} />
              </div>
              {error && <p style={{ color: '#e53e3e', fontSize: '12px' }}>{error}</p>}
              <button onClick={verifyMobileOTP} disabled={loading || mobileOtp.length < 6} style={btnStyle(loading || mobileOtp.length < 6)}>
                {loading ? 'Creating account...' : 'Verify & Sign Up →'}
              </button>
              <button onClick={() => setMobileStep('phone')} style={{ fontSize: '12px', color: '#888', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center' }}>← Change number</button>
            </div>
          )}
        </div>

        <p className="text-center text-xs mt-6" style={{ color: '#888' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#C9A84C', fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
