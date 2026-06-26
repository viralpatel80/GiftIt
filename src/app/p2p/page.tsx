'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function P2PPage() {
  const [balance, setBalance] = useState<number | null>(null)
  const [handle, setHandle] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<{ name: string; handle: string; amount: number } | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('wallet_balances').select('balance').eq('user_id', user.id).single()
        .then(({ data }) => setBalance(data?.balance ?? 0))
    })
  }, [])

  async function sendGift() {
    setLoading(true); setError('')
    const res = await fetch('/api/wallet/p2p', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientHandle: handle.trim(), amount: parseFloat(amount), note }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    setSuccess(data)
    setBalance(prev => prev !== null ? prev - data.amount : null)
    setLoading(false)
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

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#F7F4F0' }}>
        <div className="w-full max-w-sm text-center">
          <div className="text-5xl mb-4">⚡</div>
          <h2 className="text-2xl font-black mb-2" style={{ color: '#1A1A1A' }}>Gift Sent!</h2>
          <p className="text-sm mb-6" style={{ color: '#888' }}>
            ₹{success.amount.toLocaleString('en-IN')} sent to <strong style={{ color: '#1A1A1A' }}>@{success.handle}</strong> ({success.name})
          </p>
          <div className="rounded-xl p-5 mb-6" style={{ background: '#fff', border: '1px solid #E5E0D8' }}>
            <p style={{ fontSize: '12px', color: '#888' }}>Your new balance</p>
            <p className="text-3xl font-black" style={{ color: '#C9A84C' }}>
              ₹{balance !== null ? balance.toLocaleString('en-IN') : '—'}
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setSuccess(null); setHandle(''); setAmount(''); setNote('') }}
              style={{ flex: 1, background: '#fff', border: '1px solid #E5E0D8', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: 600, color: '#1A1A1A', cursor: 'pointer' }}>
              Send Another
            </button>
            <Link href="/dashboard"
              style={{ flex: 1, background: '#C9A84C', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: 700, color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#F7F4F0' }}>
      {/* Nav */}
      <nav style={{ borderBottom: '1px solid #E5E0D8', padding: '0 24px', height: '56px', display: 'flex', alignItems: 'center', gap: '16px', background: '#fff', position: 'sticky', top: 0, zIndex: 10 }}>
        <Link href="/dashboard" style={{ color: '#888', fontSize: '14px', textDecoration: 'none' }}>← Dashboard</Link>
        <span style={{ color: '#E5E0D8' }}>|</span>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#1A1A1A' }}>⚡ Send Gift</span>
      </nav>

      <div style={{ maxWidth: '440px', margin: '0 auto', padding: '32px 24px' }}>
        {/* Balance chip */}
        <div style={{ background: '#fff', border: '1px solid #E5E0D8', borderRadius: '12px', padding: '20px', marginBottom: '24px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#C9A84C' }} />
          <p style={{ fontSize: '11px', color: '#888', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Wallet Balance</p>
          <p style={{ fontSize: '32px', fontWeight: 900, color: '#1A1A1A', letterSpacing: '-0.02em' }}>
            {balance !== null ? `₹${balance.toLocaleString('en-IN')}` : '—'}
          </p>
        </div>

        <div style={{ background: '#fff', border: '1px solid #E5E0D8', borderRadius: '12px', padding: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Recipient */}
            <div>
              <label style={labelStyle}>Recipient @handle or GIFT-ID</label>
              <input type="text" placeholder="@handle, email, or GIFT-1234-5678"
                value={handle} onChange={e => setHandle(e.target.value)}
                style={inputStyle} />
              <p style={{ fontSize: '11px', color: '#AAA', marginTop: '6px' }}>Use their @handle, email address, or GIFT-ID</p>
            </div>

            {/* Amount */}
            <div>
              <label style={labelStyle}>Amount (₹)</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' as const }}>
                {[100, 250, 500, 1000].map(a => (
                  <button key={a} onClick={() => setAmount(a.toString())}
                    style={{
                      padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                      border: amount === a.toString() ? '2px solid #C9A84C' : '1px solid #E5E0D8',
                      background: amount === a.toString() ? '#FEF9EC' : '#fff',
                      color: amount === a.toString() ? '#C9A84C' : '#888', cursor: 'pointer'
                    }}>
                    ₹{a}
                  </button>
                ))}
              </div>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#888', fontSize: '14px' }}>₹</span>
                <input type="number" placeholder="Enter amount" value={amount}
                  onChange={e => setAmount(e.target.value)}
                  style={{ ...inputStyle, paddingLeft: '28px' }} />
              </div>
            </div>

            {/* Note */}
            <div>
              <label style={labelStyle}>Note <span style={{ fontWeight: 400, color: '#BBB' }}>(optional)</span></label>
              <input type="text" placeholder="Happy Birthday! 🎂" value={note}
                onChange={e => setNote(e.target.value)}
                style={inputStyle} />
            </div>

            {error && <p style={{ color: '#e53e3e', fontSize: '13px', background: '#fff5f5', padding: '10px 14px', borderRadius: '8px', border: '1px solid #fed7d7' }}>{error}</p>}

            {/* Preview */}
            {handle && amount && parseFloat(amount) > 0 && (
              <div style={{ background: '#F7F4F0', borderRadius: '8px', padding: '12px 16px', fontSize: '13px', color: '#666' }}>
                Sending <strong style={{ color: '#C9A84C' }}>₹{parseFloat(amount).toLocaleString('en-IN')}</strong> to <strong style={{ color: '#1A1A1A' }}>{handle.startsWith('@') ? handle : '@' + handle}</strong>
                {note && <> · "{note}"</>}
              </div>
            )}

            <button onClick={sendGift}
              disabled={loading || !handle || !amount || parseFloat(amount) < 1}
              style={{
                width: '100%', background: (loading || !handle || !amount || parseFloat(amount) < 1) ? '#E5E0D8' : '#C9A84C',
                color: (loading || !handle || !amount || parseFloat(amount) < 1) ? '#AAA' : '#fff',
                fontWeight: 700, borderRadius: '8px', padding: '14px', fontSize: '15px',
                border: 'none', cursor: (loading || !handle || !amount || parseFloat(amount) < 1) ? 'not-allowed' : 'pointer'
              }}>
              {loading ? 'Sending...' : 'Send Gift ⚡'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
