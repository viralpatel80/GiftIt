'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const [step, setStep] = useState<'email'|'otp'|'profile'>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [name, setName] = useState('')
  const [handle, setHandle] = useState('')
  const [handleAvail, setHandleAvail] = useState<boolean|null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function sendOTP() {
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })
    if (error) { setError(error.message || JSON.stringify(error)); setLoading(false); return }
    setStep('otp'); setLoading(false)
  }

  async function verifyOTP() {
    setLoading(true); setError('')
    const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' })
    if (error) { setError(error.message || JSON.stringify(error)); setLoading(false); return }
    setStep('profile'); setLoading(false)
  }

  async function handleGoogleSignIn() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
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
    if (!user) { setError('Session expired. Please try again.'); setLoading(false); return }
    const { error } = await supabase.from('users').upsert({
      id: user.id,
      email: user.email,
      full_name: name,
      gift_handle: handle.toLowerCase().replace(/\s/g, '.'),
      gift_numeric_id: 'GIFT-' + Math.floor(1000 + Math.random() * 9000) + '-' + Math.floor(1000 + Math.random() * 9000)
    })
    if (error) { setError(error.message); setLoading(false); return }

    // Credit ₹5000 welcome bonus — wallet_balances is a view, only write to transactions
    await supabase.from('wallet_transactions').insert({
      user_id: user.id, type: 'credit_event', amount: 5000,
      description: '🎉 Welcome to GiftIt! ₹5,000 gift credit added to your wallet'
    })

    router.push('/dashboard')
  }

  const inputStyle = {
    width: '100%', background: '#fff', border: '1px solid #E5E0D8',
    borderRadius: '8px', padding: '12px 16px', fontSize: '14px',
    color: '#1A1A1A', outline: 'none', boxSizing: 'border-box' as const,
  }
  const labelStyle = {
    display: 'block', fontSize: '11px', fontWeight: 700, color: '#888',
    textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '8px'
  }
  const btnStyle = (disabled: boolean) => ({
    width: '100%', background: disabled ? '#E5E0D8' : '#C9A84C',
    color: disabled ? '#AAA' : '#fff', fontWeight: 700, borderRadius: '8px',
    padding: '13px', fontSize: '14px', border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer'
  } as const)

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{background:'#F7F4F0'}}>
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base" style={{background:'#C9A84C'}}>🎁</div>
            <span className="text-lg font-black tracking-tight" style={{color:'#1A1A1A'}}>GiftIt</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-2" style={{color:'#1A1A1A'}}>Create your account</h1>
          <p className="text-sm" style={{color:'#888'}}>
            {step === 'email' && 'Enter your email to get started'}
            {step === 'otp' && 'Check your email for the code'}
            {step === 'profile' && 'Set up your GiftID'}
          </p>
        </div>

        <div className="flex gap-2 mb-6">
          {['email','otp','profile'].map((s,i) => (
            <div key={s} className="h-1 flex-1 rounded-full" style={{
              background: ['email','otp','profile'].indexOf(step) >= i ? '#C9A84C' : '#E5E0D8'
            }}/>
          ))}
        </div>

        <div className="p-6 rounded-xl" style={{background:'#fff',border:'1px solid #E5E0D8'}}>

          {step === 'email' && (
            <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
              {/* Google Sign In */}
              <button onClick={handleGoogleSignIn} style={{width:'100%',background:'#fff',border:'1px solid #E5E0D8',borderRadius:'8px',padding:'12px',fontSize:'14px',fontWeight:600,color:'#1A1A1A',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'10px'}}>
                <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Continue with Google
              </button>

              <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                <div style={{flex:1,height:'1px',background:'#E5E0D8'}}/>
                <span style={{fontSize:'12px',color:'#AAA'}}>or</span>
                <div style={{flex:1,height:'1px',background:'#E5E0D8'}}/>
              </div>

              <div>
                <label style={labelStyle}>Email address</label>
                <input type="email" placeholder="you@example.com" value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendOTP()}
                  style={inputStyle} />
              </div>
              {error && <p style={{color:'#e53e3e',fontSize:'12px'}}>{error}</p>}
              <button onClick={sendOTP} disabled={loading || !email.includes('@')} style={btnStyle(loading || !email.includes('@'))}>
                {loading ? 'Sending...' : 'Send Code →'}
              </button>
            </div>
          )}

          {step === 'otp' && (
            <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
              <div>
                <label style={labelStyle}>6-digit code</label>
                <p style={{fontSize:'12px',color:'#888',marginBottom:'12px'}}>Sent to {email}</p>
                <input type="text" maxLength={6} placeholder="000000" value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g,''))}
                  onKeyDown={e => e.key === 'Enter' && verifyOTP()}
                  style={{...inputStyle,textAlign:'center',fontSize:'22px',letterSpacing:'0.3em',fontFamily:'monospace'}} />
              </div>
              {error && <p style={{color:'#e53e3e',fontSize:'12px'}}>{error}</p>}
              <button onClick={verifyOTP} disabled={loading || otp.length < 6} style={btnStyle(loading || otp.length < 6)}>
                {loading ? 'Verifying...' : 'Verify Code →'}
              </button>
              <button onClick={() => setStep('email')} style={{fontSize:'12px',color:'#888',background:'none',border:'none',cursor:'pointer',textAlign:'center'}}>← Change email</button>
            </div>
          )}

          {step === 'profile' && (
            <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
              <div>
                <label style={labelStyle}>Full Name</label>
                <input type="text" placeholder="Priya Kapoor" value={name}
                  onChange={e => setName(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>@handle — your GiftID</label>
                <div style={{position:'relative'}}>
                  <span style={{position:'absolute',left:'14px',top:'50%',transform:'translateY(-50%)',color:'#888',fontSize:'14px'}}>@</span>
                  <input type="text" placeholder="priya.kapoor" value={handle}
                    onChange={e => checkHandle(e.target.value)}
                    style={{...inputStyle,paddingLeft:'30px'}} />
                  {handleAvail !== null && (
                    <span style={{position:'absolute',right:'14px',top:'50%',transform:'translateY(-50%)',fontSize:'12px',fontWeight:600,color:handleAvail?'#38a169':'#e53e3e'}}>
                      {handleAvail ? '✓ Available' : '✗ Taken'}
                    </span>
                  )}
                </div>
              </div>
              {error && <p style={{color:'#e53e3e',fontSize:'12px'}}>{error}</p>}
              <button onClick={saveProfile} disabled={loading || !name || !handle || handleAvail === false}
                style={btnStyle(loading || !name || !handle || handleAvail === false)}>
                {loading ? 'Saving...' : 'Create GiftID →'}
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs mt-6" style={{color:'#888'}}>
          Already have an account?{' '}
          <Link href="/login" style={{color:'#C9A84C',fontWeight:600}}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
