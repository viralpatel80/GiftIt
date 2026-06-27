'use client'
export const dynamic = 'force-dynamic'
import { useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function ProfileCompleteForm() {
  const [name, setName] = useState('')
  const [handle, setHandle] = useState('')
  const [handleAvail, setHandleAvail] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const phone = searchParams.get('phone')
  const supabase = createClient()

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
    const { error } = await supabase.from('users').update({
      full_name: name,
      gift_handle: handle.toLowerCase().replace(/\s/g, '.'),
    }).eq('id', user.id)
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/dashboard')
  }

  const inputStyle = {
    width: '100%', background: '#fff', border: '1px solid #E5E0D8',
    borderRadius: '8px', padding: '12px 16px', fontSize: '14px',
    color: '#1A1A1A', outline: 'none', boxSizing: 'border-box' as const,
  }
  const labelStyle = {
    display: 'block', fontSize: '11px', fontWeight: 700 as const, color: '#888',
    textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '8px'
  }
  const disabled = loading || !name || !handle || handleAvail === false

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#F7F4F0' }}>
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-6" style={{ textDecoration: 'none' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base" style={{ background: '#C9A84C' }}>🎁</div>
            <span className="text-lg font-black tracking-tight" style={{ color: '#1A1A1A' }}>GiftIt</span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight mb-2" style={{ color: '#1A1A1A' }}>One last step</h1>
          <p className="text-sm" style={{ color: '#888' }}>
            {phone ? 'Phone +91 ' + phone + ' verified' : 'Set up your GiftID'}
          </p>
        </div>
        <div className="p-6 rounded-xl" style={{ background: '#fff', border: '1px solid #E5E0D8' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Your Name</label>
              <input type="text" placeholder="Priya Kapoor" value={name}
                onChange={e => setName(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Your GiftID handle</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#888', fontSize: '14px' }}>@</span>
                <input type="text" placeholder="priya.kapoor" value={handle}
                  onChange={e => checkHandle(e.target.value)}
                  style={{ ...inputStyle, paddingLeft: '30px' }} />
                {handleAvail !== null && (
                  <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', fontWeight: 600, color: handleAvail ? '#38a169' : '#e53e3e' }}>
                    {handleAvail ? 'Available' : 'Taken'}
                  </span>
                )}
              </div>
            </div>
            {error && <p style={{ color: '#e53e3e', fontSize: '12px' }}>{error}</p>}
            <button onClick={saveProfile} disabled={disabled}
              style={{ width: '100%', background: disabled ? '#E5E0D8' : '#C9A84C', color: disabled ? '#AAA' : '#fff', fontWeight: 700, borderRadius: '8px', padding: '13px', fontSize: '14px', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Saving...' : 'Create GiftID'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ProfileCompletePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#F7F4F0' }} />}>
      <ProfileCompleteForm />
    </Suspense>
  )
}
