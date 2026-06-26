'use client'
import { useState } from 'react'

declare global { interface Window { Razorpay: any } }

const AMOUNTS = [200, 500, 1000, 2000, 5000]

export default function GiftForm({ eventId, eventTitle, recipientName }: {
  eventId: string; eventTitle: string; recipientName: string
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  async function startPayment() {
    setLoading(true); setError('')

    // Create Razorpay order
    const res = await fetch('/api/contribute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, amount: parseFloat(amount), gifterName: name, gifterEmail: email, message }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }

    // Load Razorpay script
    await loadRazorpay()

    const rzp = new window.Razorpay({
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount: data.amount,
      currency: 'INR',
      name: 'GiftIt',
      description: `Gift for ${eventTitle}`,
      order_id: data.razorpayOrderId,
      prefill: { name, email, contact: '' },
      theme: { color: '#C9A84C' },
      handler: async (response: any) => {
        // Verify payment
        const vres = await fetch('/api/contribute/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contributionId: data.contributionId, razorpayPaymentId: response.razorpay_payment_id, razorpayOrderId: response.razorpay_order_id, razorpaySignature: response.razorpay_signature }),
        })
        if (vres.ok) { setSuccess(true) } else { setError('Payment verification failed. Contact support.') }
        setLoading(false)
      },
      modal: { ondismiss: () => setLoading(false) },
    })
    rzp.open()
  }

  if (success) return (
    <div className="card p-8 text-center">
      <div className="text-4xl mb-4">🎉</div>
      <h3 className="text-lg font-bold mb-2">Gift sent!</h3>
      <p className="text-sm text-[#666]">Your gift has been added to {recipientName}'s pool.</p>
    </div>
  )

  return (
    <div className="card p-6">
      <h3 className="text-sm font-bold uppercase tracking-wider text-[#666] mb-4">Send a Gift</h3>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Your Name</label>
            <input type="text" className="input" placeholder="Rahul Sharma"
              value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">Email <span className="text-[#444] font-normal normal-case">(optional)</span></label>
            <input type="email" className="input" placeholder="rahul@email.com"
              value={email} onChange={e => setEmail(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="label">Amount</label>
          <div className="flex gap-2 mb-2 flex-wrap">
            {AMOUNTS.map(a => (
              <button key={a} onClick={() => setAmount(a.toString())}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${amount === a.toString() ? 'bg-[#C9A84C] text-black border-[#C9A84C]' : 'border-[#2A2A2A] text-[#888] hover:border-[#C9A84C]'}`}>
                ₹{a.toLocaleString('en-IN')}
              </button>
            ))}
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555] text-sm">₹</span>
            <input type="number" className="input pl-7" placeholder="Custom amount"
              value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="label">Message <span className="text-[#444] font-normal normal-case">(optional)</span></label>
          <input type="text" className="input" placeholder="Happy Birthday! 🎉"
            value={message} onChange={e => setMessage(e.target.value)} />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button className="btn-gold w-full py-3 text-base" onClick={startPayment}
          disabled={loading || !name || !amount || parseFloat(amount) < 1}>
          {loading ? 'Processing...' : `Gift ₹${amount || '—'} via UPI →`}
        </button>
        <p className="text-[10px] text-[#444] text-center">Secure payment via Razorpay · UPI, Cards, Netbanking accepted</p>
      </div>
    </div>
  )
}

function loadRazorpay(): Promise<void> {
  return new Promise(resolve => {
    if (document.querySelector('script[src*="razorpay"]')) { resolve(); return }
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = () => resolve()
    document.head.appendChild(s)
  })
}
