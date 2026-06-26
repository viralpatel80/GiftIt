'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const BRANDS = [
  { id: 'amazon', name: 'Amazon.in', emoji: '🛍️', desc: 'Everything' },
  { id: 'flipkart', name: 'Flipkart', emoji: '📱', desc: 'Electronics' },
  { id: 'myntra', name: 'Myntra', emoji: '👗', desc: 'Fashion' },
  { id: 'nykaa', name: 'Nykaa', emoji: '💄', desc: 'Beauty' },
  { id: 'pepperfry', name: 'Pepperfry', emoji: '🛋️', desc: 'Home' },
  { id: 'bookmyshow', name: 'BookMyShow', emoji: '🎟️', desc: 'Experiences' },
]

export default function RedeemPage() {
  const [balance, setBalance] = useState<number | null>(null)
  const [selectedBrand, setSelectedBrand] = useState<any>(null)
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [voucher, setVoucher] = useState<any>(null)
  const [error, setError] = useState('')
  const [vouchers, setVouchers] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: w } = await supabase.from('wallet_balances').select('balance').eq('user_id', user.id).single()
      setBalance(w?.balance ?? 0)
      const { data: v } = await supabase.from('vouchers').select('*').eq('user_id', user.id).order('issued_at', { ascending: false }).limit(5)
      setVouchers(v ?? [])
    }
    load()
  }, [voucher])

  async function generateVoucher() {
    setLoading(true); setError('')
    const res = await fetch('/api/wallet/voucher', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandId: selectedBrand.id, amount: parseFloat(amount) }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    setVoucher(data.voucher)
    setLoading(false)
  }

  const card = {
    background: '#fff', border: '1px solid #E5E0D8', borderRadius: '12px'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F7F4F0' }}>
      <nav style={{ borderBottom: '1px solid #E5E0D8', padding: '0 24px', height: '56px', display: 'flex', alignItems: 'center', gap: '16px', background: '#fff', position: 'sticky', top: 0, zIndex: 10 }}>
        <Link href="/dashboard" style={{ color: '#888', fontSize: '14px', textDecoration: 'none' }}>← Dashboard</Link>
        <span style={{ color: '#E5E0D8' }}>|</span>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#1A1A1A' }}>🛍️ Redeem Wallet</span>
      </nav>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '32px 24px' }}>
        {/* Balance */}
        <div style={{ ...card, padding: '20px', marginBottom: '24px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#C9A84C' }} />
          <p style={{ fontSize: '11px', color: '#AAA', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Available Balance</p>
          <p style={{ fontSize: '32px', fontWeight: 900, color: '#1A1A1A', letterSpacing: '-0.02em' }}>
            {balance !== null ? `₹${balance.toLocaleString('en-IN')}` : '—'}
          </p>
          <p style={{ fontSize: '12px', color: '#BBB', marginTop: '4px' }}>2% platform fee applies on redemption</p>
        </div>

        {!voucher ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Brand selection */}
            <div>
              <p style={{ fontSize: '11px', color: '#888', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>Choose Brand</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                {BRANDS.map(b => (
                  <button key={b.id} onClick={() => setSelectedBrand(b)}
                    style={{
                      ...card, padding: '14px 10px', textAlign: 'center', cursor: 'pointer',
                      border: selectedBrand?.id === b.id ? '2px solid #C9A84C' : '1px solid #E5E0D8',
                      background: selectedBrand?.id === b.id ? '#FEF9EC' : '#fff'
                    }}>
                    <div style={{ fontSize: '24px', marginBottom: '6px' }}>{b.emoji}</div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#1A1A1A' }}>{b.name}</div>
                    <div style={{ fontSize: '10px', color: '#BBB' }}>{b.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {selectedBrand && (
              <div>
                <p style={{ fontSize: '11px', color: '#888', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Amount for {selectedBrand.name}</p>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                  {[500, 1000, 2000, 5000].map(a => (
                    <button key={a} onClick={() => setAmount(a.toString())}
                      style={{
                        padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                        border: amount === a.toString() ? '2px solid #C9A84C' : '1px solid #E5E0D8',
                        background: amount === a.toString() ? '#FEF9EC' : '#fff',
                        color: amount === a.toString() ? '#C9A84C' : '#888'
                      }}>
                      ₹{a.toLocaleString('en-IN')}
                    </button>
                  ))}
                </div>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#888', fontSize: '14px' }}>₹</span>
                  <input type="number" placeholder="Custom amount (min ₹100)" value={amount}
                    onChange={e => setAmount(e.target.value)}
                    style={{ width: '100%', background: '#fff', border: '1px solid #E5E0D8', borderRadius: '8px', padding: '12px 16px 12px 28px', fontSize: '14px', color: '#1A1A1A', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                {amount && parseFloat(amount) >= 100 && (
                  <p style={{ fontSize: '12px', color: '#BBB', marginTop: '8px' }}>
                    You'll be charged ₹{(parseFloat(amount) * 1.02).toFixed(0)} (incl. 2% fee of ₹{(parseFloat(amount) * 0.02).toFixed(0)})
                  </p>
                )}
              </div>
            )}

            {error && <p style={{ color: '#e53e3e', fontSize: '13px' }}>{error}</p>}

            <button onClick={generateVoucher}
              disabled={loading || !selectedBrand || !amount || parseFloat(amount) < 100}
              style={{
                width: '100%', background: (loading || !selectedBrand || !amount || parseFloat(amount) < 100) ? '#E5E0D8' : '#C9A84C',
                color: (loading || !selectedBrand || !amount || parseFloat(amount) < 100) ? '#AAA' : '#fff',
                fontWeight: 700, borderRadius: '8px', padding: '14px', fontSize: '15px',
                border: 'none', cursor: (loading || !selectedBrand || !amount || parseFloat(amount) < 100) ? 'not-allowed' : 'pointer'
              }}>
              {loading ? 'Generating...' : `Get ${selectedBrand?.name ?? 'Brand'} Voucher →`}
            </button>
          </div>
        ) : (
          <div style={{ ...card, padding: '28px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>{selectedBrand?.emoji ?? '🎁'}</div>
            <p style={{ fontSize: '11px', color: '#C9A84C', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>{voucher.brand_name} Voucher</p>
            <p style={{ fontSize: '32px', fontWeight: 900, color: '#1A1A1A', letterSpacing: '-0.02em', marginBottom: '20px' }}>₹{voucher.amount.toLocaleString('en-IN')}</p>
            <div style={{ background: '#F7F4F0', border: '1px solid #E5E0D8', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
              <p style={{ fontSize: '10px', color: '#BBB', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Voucher Code</p>
              <p style={{ fontFamily: 'monospace', fontSize: '18px', fontWeight: 900, letterSpacing: '0.2em', color: '#C9A84C' }}>{voucher.voucher_code}</p>
            </div>
            <button onClick={() => navigator.clipboard.writeText(voucher.voucher_code)}
              style={{ width: '100%', background: '#C9A84C', color: '#fff', fontWeight: 700, borderRadius: '8px', padding: '13px', fontSize: '14px', border: 'none', cursor: 'pointer', marginBottom: '12px' }}>
              Copy Code
            </button>
            <p style={{ fontSize: '12px', color: '#BBB', marginBottom: '16px' }}>Apply this code at {voucher.brand_name} checkout under "Gift Card / Voucher"</p>
            <button onClick={() => { setVoucher(null); setSelectedBrand(null); setAmount('') }}
              style={{ fontSize: '12px', color: '#888', background: 'none', border: 'none', cursor: 'pointer' }}>← Generate another voucher</button>
          </div>
        )}

        {/* Past vouchers */}
        {vouchers.length > 0 && !voucher && (
          <div style={{ marginTop: '32px' }}>
            <h3 style={{ fontSize: '11px', color: '#888', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>Your Vouchers</h3>
            <div style={{ ...card, overflow: 'hidden' }}>
              {vouchers.map((v: any, i: number) => (
                <div key={v.id} style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: i < vouchers.length - 1 ? '1px solid #F0EDE8' : 'none' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#1A1A1A' }}>{v.brand_name}</p>
                    <p style={{ fontSize: '12px', fontFamily: 'monospace', color: '#C9A84C' }}>{v.voucher_code}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: '#1A1A1A' }}>₹{v.amount.toLocaleString('en-IN')}</p>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: v.status === 'active' ? '#38a169' : '#BBB' }}>{v.status.toUpperCase()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
