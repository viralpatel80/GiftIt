'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  userId: string
  missingPhone: boolean
  missingEmail: boolean
}

export default function ProfileCompleteBanner({ userId, missingPhone, missingEmail }: Props) {
  const supabase = createClient()
  const [done, setDone] = useState(false)

  // Phone states
  const [phone, setPhone] = useState('')
  const [phoneOtp, setPhoneOtp] = useState('')
  const [phoneStep, setPhoneStep] = useState<'input' | 'otp'>('input')

  // Email states
  const [email, setEmail] = useState('')
  const [emailOtp, setEmailOtp] = useState('')
  const [emailStep, setEmailStep] = useState<'input' | 'otp'>('input')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Show phone banner first; if phone done, show email banner
  const [phoneDone, setPhoneDone] = useState(!missingPhone)
  const [emailDone, setEmailDone] = useState(!missingEmail)

  if (done || (phoneDone && emailDone)) return null

  const inp = {
    flex: 1, background: '#fff', border: '1px solid #D0B060',
    borderRadius: '8px', padding: '10px 14px', fontSize: '14px',
    color: '#1A1A1A', outline: 'none',
  }

  // ── Phone handlers ──────────────────────────────────────────
  async function sendPhoneOTP() {
    setLoading(true); setError('')
    const cleaned = phone.replace(/\D/g, '').slice(-10)
    if (cleaned.length < 10) { setError('Enter a valid 10-digit number'); setLoading(false); return }

    // Check not already used
    const res = await fetch('/api/auth/check-exists', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: cleaned }),
    })
    const check = await res.json()
    if (check.exists) { setError('This number is already linked to another account.'); setLoading(false); return }

    const otpRes = await fetch('/api/auth/whatsapp-otp/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: cleaned }),
    })
    const otpData = await otpRes.json()
    if (!otpRes.ok) { setError(otpData.error); setLoading(false); return }
    setPhoneStep('otp'); setLoading(false)
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

    await supabase.from('users').update({ phone: cleaned, phone_verified: true }).eq('id', userId)
    setSuccess('Phone verified!'); setPhoneDone(true); setLoading(false)
    setTimeout(() => setSuccess(''), 3000)
  }

  // ── Email handlers ──────────────────────────────────────────
  async function sendEmailOTP() {
    setLoading(true); setError('')

    const res = await fetch('/api/auth/check-exists', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const check = await res.json()
    if (check.exists) { setError('This email is already registered to another account.'); setLoading(false); return }

    const { error } = await supabase.auth.updateUser({ email })
    if (error) { setError(error.message); setLoading(false); return }
    setEmailStep('otp'); setLoading(false)
  }

  async function verifyEmailOTP() {
    setLoading(true); setError('')
    const { error } = await supabase.auth.verifyOtp({ email, token: emailOtp, type: 'email_change' })
    if (error) { setError(error.message); setLoading(false); return }
    await supabase.from('users').update({ email }).eq('id', userId)
    setSuccess('Email verified!'); setEmailDone(true); setLoading(false)
    setTimeout(() => setSuccess(''), 3000)
  }

  const bannerStyle = {
    background: '#FFF8E7', border: '1px solid #F0D060', borderRadius: '12px',
    padding: '16px 20px', marginBottom: '20px',
  }

  return (
    <div>
      {/* Phone banner */}
      {!phoneDone && (
        <div style={bannerStyle}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
            <span style={{ fontSize: '20px' }}>📱</span>
            <div>
              <p style={{ fontWeight: 700, fontSize: '14px', color: '#7A5C00', margin: '0 0 2px' }}>Add your mobile number</p>
              <p style={{ fontSize: '12px', color: '#A07820', margin: 0 }}>Required to send and receive gifts via WhatsApp</p>
            </div>
          </div>

          {phoneStep === 'input' && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ background: '#FFF8E7', border: '1px solid #D0B060', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', color: '#888', flexShrink: 0 }}>+91</div>
              <input type="tel" placeholder="9876543210" value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                style={inp} />
              <button onClick={sendPhoneOTP} disabled={loading || phone.length < 10}
                style={{ background: phone.length >= 10 ? '#C9A84C' : '#E5E0D8', color: phone.length >= 10 ? '#fff' : '#AAA', fontWeight: 700, border: 'none', borderRadius: '8px', padding: '10px 16px', cursor: phone.length >= 10 ? 'pointer' : 'not-allowed', fontSize: '13px', flexShrink: 0 }}>
                {loading ? '...' : 'Send OTP'}
              </button>
            </div>
          )}

          {phoneStep === 'otp' && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <p style={{ fontSize: '12px', color: '#888', margin: 0, flexShrink: 0 }}>WhatsApp code:</p>
              <input type="text" maxLength={6} placeholder="000000" value={phoneOtp}
                onChange={e => setPhoneOtp(e.target.value.replace(/\D/g, ''))}
                style={{ ...inp, textAlign: 'center', fontFamily: 'monospace', fontSize: '18px', letterSpacing: '0.2em', maxWidth: '140px' }} />
              <button onClick={verifyPhoneOTP} disabled={loading || phoneOtp.length < 6}
                style={{ background: phoneOtp.length >= 6 ? '#38a169' : '#E5E0D8', color: phoneOtp.length >= 6 ? '#fff' : '#AAA', fontWeight: 700, border: 'none', borderRadius: '8px', padding: '10px 16px', cursor: phoneOtp.length >= 6 ? 'pointer' : 'not-allowed', fontSize: '13px', flexShrink: 0 }}>
                {loading ? '...' : 'Verify ✓'}
              </button>
              <button onClick={() => setPhoneStep('input')} style={{ fontSize: '12px', color: '#888', background: 'none', border: 'none', cursor: 'pointer' }}>← Back</button>
            </div>
          )}

          {error && <p style={{ color: '#e53e3e', fontSize: '12px', margin: '8px 0 0' }}>{error}</p>}
          {success && <p style={{ color: '#38a169', fontSize: '12px', margin: '8px 0 0', fontWeight: 600 }}>{success}</p>}
        </div>
      )}

      {/* Email banner — shown after phone done OR if phone was already there */}
      {phoneDone && !emailDone && (
        <div style={bannerStyle}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
            <span style={{ fontSize: '20px' }}>✉️</span>
            <div>
              <p style={{ fontWeight: 700, fontSize: '14px', color: '#7A5C00', margin: '0 0 2px' }}>Add your email address</p>
              <p style={{ fontSize: '12px', color: '#A07820', margin: 0 }}>Required to secure your account and receive notifications</p>
            </div>
          </div>

          {emailStep === 'input' && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="email" placeholder="you@example.com" value={email}
                onChange={e => setEmail(e.target.value)} style={inp} />
              <button onClick={sendEmailOTP} disabled={loading || !email.includes('@')}
                style={{ background: email.includes('@') ? '#C9A84C' : '#E5E0D8', color: email.includes('@') ? '#fff' : '#AAA', fontWeight: 700, border: 'none', borderRadius: '8px', padding: '10px 16px', cursor: email.includes('@') ? 'pointer' : 'not-allowed', fontSize: '13px', flexShrink: 0 }}>
                {loading ? '...' : 'Send Code'}
              </button>
            </div>
          )}

          {emailStep === 'otp' && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <p style={{ fontSize: '12px', color: '#888', margin: 0, flexShrink: 0 }}>Code from email:</p>
              <input type="text" maxLength={6} placeholder="000000" value={emailOtp}
                onChange={e => setEmailOtp(e.target.value.replace(/\D/g, ''))}
                style={{ ...inp, textAlign: 'center', fontFamily: 'monospace', fontSize: '18px', letterSpacing: '0.2em', maxWidth: '140px' }} />
              <button onClick={verifyEmailOTP} disabled={loading || emailOtp.length < 6}
                style={{ background: emailOtp.length >= 6 ? '#38a169' : '#E5E0D8', color: emailOtp.length >= 6 ? '#fff' : '#AAA', fontWeight: 700, border: 'none', borderRadius: '8px', padding: '10px 16px', cursor: emailOtp.length >= 6 ? 'pointer' : 'not-allowed', fontSize: '13px', flexShrink: 0 }}>
                {loading ? '...' : 'Verify ✓'}
              </button>
              <button onClick={() => setEmailStep('input')} style={{ fontSize: '12px', color: '#888', background: 'none', border: 'none', cursor: 'pointer' }}>← Back</button>
            </div>
          )}

          {error && <p style={{ color: '#e53e3e', fontSize: '12px', margin: '8px 0 0' }}>{error}</p>}
          {success && <p style={{ color: '#38a169', fontSize: '12px', margin: '8px 0 0', fontWeight: 600 }}>{success}</p>}
        </div>
      )}
    </div>
  )
}
