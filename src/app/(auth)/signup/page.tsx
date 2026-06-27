'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type EmailStep = 'email' | 'otp' | 'profile' | 'phone' | 'phone_otp'
type MobileStep = 'phone' | 'phone_otp' | 'profile' | 'email' | 'email_otp'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

export default function SignupPage() {
  const [tab, setTab] = useState<'email' | 'mobile'>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  // Shared profile fields
  const [name, setName] = useState('')
  const [gender, setGender] = useState('')
  const [handle, setHandle] = useState('')
  const [handleAvail, setHandleAvail] = useState<boolean | null>(null)

  // Email flow
  const [emailStep, setEmailStep] = useState<EmailStep>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [phone, setPhone] = useState('')
  const [phoneOtp, setPhoneOtp] = useState('')

  // Mobile flow
  const [mobileStep, setMobileStep] = useState<MobileStep>('phone')
  const [mobilePhone, setMobilePhone] = useState('')
  const [mobileOtp, setMobileOtp] = useState('')
  const [mobileEmail, setMobileEmail] = useState('')
  const [mobileEmailOtp, setMobileEmailOtp] = useState('')

  const [existingUser, setExistingUser] = useState<'email' | 'phone' | null>(null)

  const inp = {
    width: '100%', background: '#fff', border: '1px solid #E5E0D8',
    borderRadius: '8px', padding: '12px 16px', fontSize: '14px',
    color: '#1A1A1A', outline: 'none', boxSizing: 'border-box' as const,
  }
  const lbl = {
    display: 'block', fontSize: '11px', fontWeight: 700 as const, color: '#888',
    textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '8px'
  }
  const btn = (dis: boolean) => ({
    width: '100%', background: dis ? '#E5E0D8' : '#C9A84C',
    color: dis ? '#AAA' : '#fff', fontWeight: 700 as const, borderRadius: '8px',
    padding: '13px', fontSize: '14px', border: 'none',
    cursor: dis ? 'not-allowed' as const : 'pointer' as const,
  })

  async function checkExists(type: 'email' | 'phone', value: string) {
    const res = await fetch('/api/auth/check-exists', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [type]: value }),
    })
    const data = await res.json()
    return data.exists as boolean
  }

  async function checkHandle(h: string) {
    setHandle(h)
    if (h.length < 3) { setHandleAvail(null); return }
    const { data } = await supabase.from('users').select('id').eq('gift_handle', h).maybeSingle()
    setHandleAvail(!data)
  }

  function giftId() {
    return 'GIFT-' + Math.floor(1000 + Math.random() * 9000) + '-' + Math.floor(1000 + Math.random() * 9000)
  }

  // ─── EMAIL FLOW ──────────────────────────────────────────────

  async function sendEmailOTP() {
    setLoading(true); setError(''); setExistingUser(null)
    const exists = await checkExists('email', email)
    if (exists) { setExistingUser('email'); setLoading(false); return }
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

  async function saveEmailProfile() {
    setLoading(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Session expired. Please restart.'); setLoading(false); return }
    const { error } = await supabase.from('users').upsert({
      id: user.id, email: user.email, full_name: name, gender,
      gift_handle: handle.toLowerCase().replace(/\s+/g, '.'),
      gift_numeric_id: giftId(),
    })
    if (error) { setError(error.message); setLoading(false); return }
    setEmailStep('phone'); setLoading(false)
  }

  async function sendPhoneOTP() {
    setLoading(true); setError('')
    const cleaned = phone.replace(/\D/g, '').slice(-10)
    const exists = await checkExists('phone', cleaned)
    if (exists) { setError('This number is already linked to another account.'); setLoading(false); return }
    const res = await fetch('/api/auth/whatsapp-otp/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: cleaned }),
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
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('users').update({ phone: cleaned, phone_verified: true }).eq('id', user.id)
      await supabase.from('wallet_transactions').insert({
        user_id: user.id, type: 'credit_event', amount: 5000,
        description: 'Welcome to GiftIt! Rs.5,000 gift credit added to your wallet',
      })
    }
    router.push('/dashboard')
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  // ─── MOBILE FLOW ─────────────────────────────────────────────

  async function sendMobileOTP() {
    setLoading(true); setError(''); setExistingUser(null)
    const cleaned = mobilePhone.replace(/\D/g, '').slice(-10)
    const exists = await checkExists('phone', cleaned)
    if (exists) { setExistingUser('phone'); setLoading(false); return }
    const res = await fetch('/api/auth/whatsapp-otp/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: cleaned }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    setMobileStep('phone_otp'); setLoading(false)
  }

  async function verifyMobilePhoneOTP() {
    setLoading(true); setError('')
    const cleaned = mobilePhone.replace(/\D/g, '').slice(-10)
    const res = await fetch('/api/auth/whatsapp-otp/verify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: cleaned, otp: mobileOtp }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    setMobileStep('profile'); setLoading(false)
  }

  async function sendMobileEmailOTP() {
    setLoading(true); setError('')
    const exists = await checkExists('email', mobileEmail)
    if (exists) { setError('This email is already registered. Sign in instead.'); setLoading(false); return }
    const { error } = await supabase.auth.signInWithOtp({ email: mobileEmail, options: { shouldCreateUser: true } })
    if (error) { setError(error.message); setLoading(false); return }
    setMobileStep('email_otp'); setLoading(false)
  }

  async function verifyMobileEmailOTP() {
    setLoading(true); setError('')
    const { data, error } = await supabase.auth.verifyOtp({ email: mobileEmail, token: mobileEmailOtp, type: 'email' })
    if (error || !data.user) { setError(error?.message || 'Verification failed'); setLoading(false); return }
    const cleaned = mobilePhone.replace(/\D/g, '').slice(-10)
    const { error: upsertErr } = await supabase.from('users').upsert({
      id: data.user.id, email: mobileEmail, full_name: name, gender,
      phone: cleaned, phone_verified: true,
      gift_handle: handle.toLowerCase().replace(/\s+/g, '.'),
      gift_numeric_id: giftId(),
    })
    if (upsertErr) { setError(upsertErr.message); setLoading(false); return }
    await supabase.from('wallet_transactions').insert({
      user_id: data.user.id, type: 'credit_event', amount: 5000,
      description: 'Welcome to GiftIt! Rs.5,000 gift credit added to your wallet',
    })
    router.push('/dashboard')
  }

  // ─── PROGRESS BAR ────────────────────────────────────────────
  const emailSteps: EmailStep[] = ['email', 'otp', 'profile', 'phone', 'phone_otp']
  const mobileSteps: MobileStep[] = ['phone', 'phone_otp', 'profile', 'email', 'email_otp']
  const steps = tab === 'email' ? emailSteps : mobileSteps
  const currentStep = tab === 'email' ? emailStep : mobileStep
  const stepIdx = steps.indexOf(currentStep as never)

  const onFirstStep = (tab === 'email' && emailStep === 'email') || (tab === 'mobile' && mobileStep === 'phone')

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#F7F4F0' }}>
      <div className="w-full max-w-sm">

        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-6" style={{ textDecoration: 'none' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base" style={{ background: '#C9A84C' }}>🎁</div>
            <span className="text-lg font-black tracking-tight" style={{ color: '#1A1A1A' }}>GiftIt</span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ color: '#1A1A1A' }}>Create your account</h1>
          <p className="text-sm" style={{ color: '#888' }}>Step {stepIdx + 1} of {steps.length}</p>
        </div>

        {/* Progress */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '20px' }}>
          {steps.map((_, i) => (
            <div key={i} style={{ flex: 1, height: '3px', borderRadius: '99px', background: i <= stepIdx ? '#C9A84C' : '#E5E0D8', transition: 'background 0.3s' }} />
          ))}
        </div>

        {/* Tabs — only on first step */}
        {onFirstStep && (
          <div style={{ display: 'flex', background: '#fff', border: '1px solid #E5E0D8', borderRadius: '10px', padding: '4px', marginBottom: '16px', gap: '4px' }}>
            {(['email', 'mobile'] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); setError(''); setExistingUser(null) }}
                style={{ flex: 1, padding: '8px', borderRadius: '7px', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer', background: tab === t ? '#C9A84C' : 'transparent', color: tab === t ? '#fff' : '#888' }}>
                {t === 'email' ? '✉️ Email' : '📱 Mobile'}
              </button>
            ))}
          </div>
        )}

        <div style={{ background: '#fff', border: '1px solid #E5E0D8', borderRadius: '12px', padding: '24px' }}>

          {/* ── EMAIL STEP 1: Email input ── */}
          {tab === 'email' && emailStep === 'email' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <button onClick={handleGoogle} style={{ width: '100%', background: '#fff', border: '1px solid #E5E0D8', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: 600, color: '#1A1A1A', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                <GoogleIcon /> Continue with Google
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 1, height: '1px', background: '#E5E0D8' }} />
                <span style={{ fontSize: '12px', color: '#AAA' }}>or</span>
                <div style={{ flex: 1, height: '1px', background: '#E5E0D8' }} />
              </div>
              <div>
                <label style={lbl}>Email address</label>
                <input type="email" placeholder="you@example.com" value={email}
                  onChange={e => { setEmail(e.target.value); setExistingUser(null) }}
                  onKeyDown={e => e.key === 'Enter' && sendEmailOTP()} style={inp} />
              </div>
              {existingUser === 'email' && (
                <div style={{ background: '#FFF8E7', border: '1px solid #F0D060', borderRadius: '8px', padding: '12px', fontSize: '13px', color: '#7A5C00' }}>
                  Account already exists with this email.{' '}
                  <Link href="/login" style={{ color: '#C9A84C', fontWeight: 700 }}>Sign in instead →</Link>
                </div>
              )}
              {error && <p style={{ color: '#e53e3e', fontSize: '12px', margin: 0 }}>{error}</p>}
              {existingUser !== 'email' && (
                <button onClick={sendEmailOTP} disabled={loading || !email.includes('@')} style={btn(loading || !email.includes('@'))}>
                  {loading ? 'Checking...' : 'Continue →'}
                </button>
              )}
            </div>
          )}

          {/* ── EMAIL STEP 2: Email OTP ── */}
          {tab === 'email' && emailStep === 'otp' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={lbl}>6-digit code</label>
                <p style={{ fontSize: '12px', color: '#888', margin: '0 0 12px' }}>Sent to {email}</p>
                <input type="text" maxLength={6} placeholder="000000" value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={e => e.key === 'Enter' && verifyEmailOTP()}
                  style={{ ...inp, textAlign: 'center', fontSize: '24px', letterSpacing: '0.35em', fontFamily: 'monospace' }} />
              </div>
              {error && <p style={{ color: '#e53e3e', fontSize: '12px', margin: 0 }}>{error}</p>}
              <button onClick={verifyEmailOTP} disabled={loading || otp.length < 6} style={btn(loading || otp.length < 6)}>
                {loading ? 'Verifying...' : 'Verify Email →'}
              </button>
              <button onClick={() => setEmailStep('email')} style={{ fontSize: '12px', color: '#888', background: 'none', border: 'none', cursor: 'pointer' }}>← Change email</button>
            </div>
          )}

          {/* ── EMAIL STEP 3: Profile ── */}
          {tab === 'email' && emailStep === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>Tell us a bit about yourself</p>
              <div>
                <label style={lbl}>Full Name</label>
                <input type="text" placeholder="Priya Kapoor" value={name}
                  onChange={e => setName(e.target.value)} style={inp} />
              </div>
              <div>
                <label style={lbl}>Gender</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['Male', 'Female', 'Other'].map(g => (
                    <button key={g} onClick={() => setGender(g)} style={{ flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, border: '1px solid', cursor: 'pointer', background: gender === g ? '#C9A84C' : '#fff', color: gender === g ? '#fff' : '#888', borderColor: gender === g ? '#C9A84C' : '#E5E0D8' }}>{g}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={lbl}>@handle — your GiftID</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#888', fontSize: '14px' }}>@</span>
                  <input type="text" placeholder="priya.kapoor" value={handle}
                    onChange={e => checkHandle(e.target.value)}
                    style={{ ...inp, paddingLeft: '28px' }} />
                  {handleAvail !== null && (
                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', fontWeight: 700, color: handleAvail ? '#38a169' : '#e53e3e' }}>
                      {handleAvail ? '✓ Free' : '✗ Taken'}
                    </span>
                  )}
                </div>
              </div>
              {error && <p style={{ color: '#e53e3e', fontSize: '12px', margin: 0 }}>{error}</p>}
              <button onClick={saveEmailProfile} disabled={loading || !name || !gender || !handle || handleAvail === false}
                style={btn(loading || !name || !gender || !handle || handleAvail === false)}>
                {loading ? 'Saving...' : 'Next →'}
              </button>
            </div>
          )}

          {/* ── EMAIL STEP 4: Phone ── */}
          {tab === 'email' && emailStep === 'phone' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '36px', marginBottom: '6px' }}>📱</div>
                <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>Verify your mobile to enable WhatsApp gifting</p>
              </div>
              <div>
                <label style={lbl}>Mobile Number</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ background: '#F7F4F0', border: '1px solid #E5E0D8', borderRadius: '8px', padding: '12px 14px', fontSize: '14px', color: '#888', flexShrink: 0 }}>+91</div>
                  <input type="tel" placeholder="9876543210" value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    onKeyDown={e => e.key === 'Enter' && sendPhoneOTP()} style={inp} />
                </div>
              </div>
              {error && <p style={{ color: '#e53e3e', fontSize: '12px', margin: 0 }}>{error}</p>}
              <button onClick={sendPhoneOTP} disabled={loading || phone.length < 10} style={btn(loading || phone.length < 10)}>
                {loading ? 'Sending...' : 'Send WhatsApp OTP →'}
              </button>
            </div>
          )}

          {/* ── EMAIL STEP 5: Phone OTP ── */}
          {tab === 'email' && emailStep === 'phone_otp' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={lbl}>WhatsApp Code</label>
                <p style={{ fontSize: '12px', color: '#888', margin: '0 0 12px' }}>Sent to +91 {phone} via WhatsApp</p>
                <input type="text" maxLength={6} placeholder="000000" value={phoneOtp}
                  onChange={e => setPhoneOtp(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={e => e.key === 'Enter' && verifyPhoneOTP()}
                  style={{ ...inp, textAlign: 'center', fontSize: '24px', letterSpacing: '0.35em', fontFamily: 'monospace' }} />
              </div>
              {error && <p style={{ color: '#e53e3e', fontSize: '12px', margin: 0 }}>{error}</p>}
              <button onClick={verifyPhoneOTP} disabled={loading || phoneOtp.length < 6} style={btn(loading || phoneOtp.length < 6)}>
                {loading ? 'Almost done...' : 'Verify & Go to Dashboard →'}
              </button>
              <button onClick={() => setEmailStep('phone')} style={{ fontSize: '12px', color: '#888', background: 'none', border: 'none', cursor: 'pointer' }}>← Change number</button>
            </div>
          )}

          {/* ── MOBILE STEP 1: Phone ── */}
          {tab === 'mobile' && mobileStep === 'phone' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={lbl}>Mobile Number</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ background: '#F7F4F0', border: '1px solid #E5E0D8', borderRadius: '8px', padding: '12px 14px', fontSize: '14px', color: '#888', flexShrink: 0 }}>+91</div>
                  <input type="tel" placeholder="9876543210" value={mobilePhone}
                    onChange={e => { setMobilePhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setExistingUser(null) }}
                    onKeyDown={e => e.key === 'Enter' && sendMobileOTP()} style={inp} />
                </div>
              </div>
              {existingUser === 'phone' && (
                <div style={{ background: '#FFF8E7', border: '1px solid #F0D060', borderRadius: '8px', padding: '12px', fontSize: '13px', color: '#7A5C00' }}>
                  Account already exists with this number.{' '}
                  <Link href="/login" style={{ color: '#C9A84C', fontWeight: 700 }}>Sign in instead →</Link>
                </div>
              )}
              {error && <p style={{ color: '#e53e3e', fontSize: '12px', margin: 0 }}>{error}</p>}
              {existingUser !== 'phone' && (
                <button onClick={sendMobileOTP} disabled={loading || mobilePhone.length < 10} style={btn(loading || mobilePhone.length < 10)}>
                  {loading ? 'Checking...' : 'Send WhatsApp OTP →'}
                </button>
              )}
            </div>
          )}

          {/* ── MOBILE STEP 2: Phone OTP ── */}
          {tab === 'mobile' && mobileStep === 'phone_otp' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={lbl}>WhatsApp Code</label>
                <p style={{ fontSize: '12px', color: '#888', margin: '0 0 12px' }}>Sent to +91 {mobilePhone} via WhatsApp</p>
                <input type="text" maxLength={6} placeholder="000000" value={mobileOtp}
                  onChange={e => setMobileOtp(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={e => e.key === 'Enter' && verifyMobilePhoneOTP()}
                  style={{ ...inp, textAlign: 'center', fontSize: '24px', letterSpacing: '0.35em', fontFamily: 'monospace' }} />
              </div>
              {error && <p style={{ color: '#e53e3e', fontSize: '12px', margin: 0 }}>{error}</p>}
              <button onClick={verifyMobilePhoneOTP} disabled={loading || mobileOtp.length < 6} style={btn(loading || mobileOtp.length < 6)}>
                {loading ? 'Verifying...' : 'Verify Phone →'}
              </button>
              <button onClick={() => setMobileStep('phone')} style={{ fontSize: '12px', color: '#888', background: 'none', border: 'none', cursor: 'pointer' }}>← Change number</button>
            </div>
          )}

          {/* ── MOBILE STEP 3: Profile ── */}
          {tab === 'mobile' && mobileStep === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>Tell us a bit about yourself</p>
              <div>
                <label style={lbl}>Full Name</label>
                <input type="text" placeholder="Priya Kapoor" value={name}
                  onChange={e => setName(e.target.value)} style={inp} />
              </div>
              <div>
                <label style={lbl}>Gender</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['Male', 'Female', 'Other'].map(g => (
                    <button key={g} onClick={() => setGender(g)} style={{ flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, border: '1px solid', cursor: 'pointer', background: gender === g ? '#C9A84C' : '#fff', color: gender === g ? '#fff' : '#888', borderColor: gender === g ? '#C9A84C' : '#E5E0D8' }}>{g}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={lbl}>@handle — your GiftID</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#888', fontSize: '14px' }}>@</span>
                  <input type="text" placeholder="priya.kapoor" value={handle}
                    onChange={e => checkHandle(e.target.value)}
                    style={{ ...inp, paddingLeft: '28px' }} />
                  {handleAvail !== null && (
                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', fontWeight: 700, color: handleAvail ? '#38a169' : '#e53e3e' }}>
                      {handleAvail ? '✓ Free' : '✗ Taken'}
                    </span>
                  )}
                </div>
              </div>
              {error && <p style={{ color: '#e53e3e', fontSize: '12px', margin: 0 }}>{error}</p>}
              <button
                onClick={() => { if (!name || !gender || !handle || handleAvail === false) { setError('Please fill all fields and pick a valid handle'); return }; setError(''); setMobileStep('email') }}
                disabled={!name || !gender || !handle || handleAvail === false}
                style={btn(!name || !gender || !handle || handleAvail === false)}>
                Next →
              </button>
            </div>
          )}

          {/* ── MOBILE STEP 4: Email ── */}
          {tab === 'mobile' && mobileStep === 'email' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '36px', marginBottom: '6px' }}>✉️</div>
                <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>Add your email to secure your account</p>
              </div>
              <div>
                <label style={lbl}>Email Address</label>
                <input type="email" placeholder="you@example.com" value={mobileEmail}
                  onChange={e => setMobileEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMobileEmailOTP()} style={inp} />
              </div>
              {error && <p style={{ color: '#e53e3e', fontSize: '12px', margin: 0 }}>{error}</p>}
              <button onClick={sendMobileEmailOTP} disabled={loading || !mobileEmail.includes('@')} style={btn(loading || !mobileEmail.includes('@'))}>
                {loading ? 'Sending...' : 'Send Email Code →'}
              </button>
            </div>
          )}

          {/* ── MOBILE STEP 5: Email OTP ── */}
          {tab === 'mobile' && mobileStep === 'email_otp' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={lbl}>Email verification code</label>
                <p style={{ fontSize: '12px', color: '#888', margin: '0 0 12px' }}>Sent to {mobileEmail}</p>
                <input type="text" maxLength={6} placeholder="000000" value={mobileEmailOtp}
                  onChange={e => setMobileEmailOtp(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={e => e.key === 'Enter' && verifyMobileEmailOTP()}
                  style={{ ...inp, textAlign: 'center', fontSize: '24px', letterSpacing: '0.35em', fontFamily: 'monospace' }} />
              </div>
              {error && <p style={{ color: '#e53e3e', fontSize: '12px', margin: 0 }}>{error}</p>}
              <button onClick={verifyMobileEmailOTP} disabled={loading || mobileEmailOtp.length < 6} style={btn(loading || mobileEmailOtp.length < 6)}>
                {loading ? 'Creating account...' : 'Verify & Create Account →'}
              </button>
              <button onClick={() => setMobileStep('email')} style={{ fontSize: '12px', color: '#888', background: 'none', border: 'none', cursor: 'pointer' }}>← Change email</button>
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
