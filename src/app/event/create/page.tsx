'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const EVENT_TYPES = [
  { value: 'birthday', label: 'Birthday', emoji: '🎂' },
  { value: 'baby_shower', label: 'Baby Shower', emoji: '👶' },
  { value: 'wedding', label: 'Wedding', emoji: '💍' },
  { value: 'housewarming', label: 'Housewarming', emoji: '🏠' },
  { value: 'graduation', label: 'Graduation', emoji: '🎓' },
  { value: 'anniversary', label: 'Anniversary', emoji: '💕' },
  { value: 'festival', label: 'Festival', emoji: '🪔' },
  { value: 'custom', label: 'Custom', emoji: '✨' },
]

export default function CreateEventPage() {
  const [type, setType] = useState('birthday')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [isSurprise, setIsSurprise] = useState(false)
  const [recipientSearch, setRecipientSearch] = useState('')
  const [recipient, setRecipient] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const inp = {
    width: '100%', background: '#fff', border: '1px solid #E5E0D8',
    borderRadius: '8px', padding: '11px 14px', fontSize: '14px',
    color: '#1A1A1A', outline: 'none', boxSizing: 'border-box' as const,
  }
  const lbl = {
    display: 'block', fontSize: '11px', fontWeight: 700 as const, color: '#888',
    textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '8px'
  }

  async function searchRecipient() {
    setSearching(true)
    const q = recipientSearch.trim()
    let query = supabase.from('users').select('id, full_name, gift_handle, gift_numeric_id')
    if (q.startsWith('@')) {
      query = query.eq('gift_handle', q.slice(1))
    } else if (q.includes('@') && q.includes('.')) {
      query = query.eq('email', q)
    } else {
      query = query.eq('phone', q.replace(/\D/g, '').slice(-10))
    }
    const { data } = await query.maybeSingle()
    setRecipient(data || null)
    if (!data) alert('No user found. Try @handle, email, or phone.')
    setSearching(false)
  }

  async function createEvent() {
    if (!title.trim()) { setError('Please enter an event title'); return }
    setLoading(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not signed in'); setLoading(false); return }

    const { data, error: err } = await supabase.from('events').insert({
      creator_id: user.id,
      recipient_id: recipient ? recipient.id : user.id,
      type, title: title.trim(),
      description: description.trim() || null,
      target_amount: targetAmount ? parseFloat(targetAmount) : null,
      event_date: eventDate || null,
      is_surprise: isSurprise,
    }).select().single()

    if (err) { setError(err.message); setLoading(false); return }
    router.push(`/event/${data.id}`)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F7F4F0' }}>
      {/* Nav */}
      <nav style={{ borderBottom: '1px solid #E5E0D8', padding: '0 24px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '28px', height: '28px', background: '#C9A84C', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>🎁</div>
          <span style={{ fontWeight: 900, fontSize: '15px', color: '#1A1A1A' }}>GiftIt</span>
        </div>
        <Link href="/dashboard" style={{ fontSize: '13px', fontWeight: 600, color: '#C9A84C', textDecoration: 'none' }}>← Dashboard</Link>
      </nav>

      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '32px 24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#1A1A1A', marginBottom: '4px' }}>Create a Gift Event</h1>
        <p style={{ fontSize: '14px', color: '#888', marginBottom: '28px' }}>Set up a gift pool — share the link with friends</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Event type */}
          <div>
            <label style={lbl}>Occasion</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {EVENT_TYPES.map(et => (
                <button key={et.value} onClick={() => setType(et.value)}
                  style={{ padding: '12px 8px', borderRadius: '10px', textAlign: 'center', cursor: 'pointer', border: '1.5px solid', background: type === et.value ? '#FFF8E7' : '#fff', borderColor: type === et.value ? '#C9A84C' : '#E5E0D8' }}>
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>{et.emoji}</div>
                  <div style={{ fontSize: '10px', color: type === et.value ? '#C9A84C' : '#888', fontWeight: 600 }}>{et.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label style={lbl}>Event Title <span style={{ color: '#e53e3e' }}>*</span></label>
            <input type="text" placeholder="Priya's 30th Birthday 🎂" value={title}
              onChange={e => setTitle(e.target.value)} style={inp} />
          </div>

          {/* Description */}
          <div>
            <label style={lbl}>Description <span style={{ fontWeight: 400, textTransform: 'none', color: '#AAA' }}>(optional)</span></label>
            <textarea placeholder="A message to gifters..." value={description}
              onChange={e => setDescription(e.target.value)}
              style={{ ...inp, height: '80px', resize: 'none' as const }} />
          </div>

          {/* Target + Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={lbl}>Target Amount <span style={{ fontWeight: 400, textTransform: 'none', color: '#AAA' }}>(optional)</span></label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#888' }}>₹</span>
                <input type="number" placeholder="25000" value={targetAmount}
                  onChange={e => setTargetAmount(e.target.value)}
                  style={{ ...inp, paddingLeft: '28px' }} />
              </div>
            </div>
            <div>
              <label style={lbl}>Event Date <span style={{ fontWeight: 400, textTransform: 'none', color: '#AAA' }}>(optional)</span></label>
              <input type="date" value={eventDate}
                onChange={e => setEventDate(e.target.value)} style={inp} />
            </div>
          </div>

          {/* Recipient */}
          <div>
            <label style={lbl}>For someone else? <span style={{ fontWeight: 400, textTransform: 'none', color: '#AAA' }}>(leave blank = for you)</span></label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="text" placeholder="@handle, email, or phone"
                value={recipientSearch}
                onChange={e => { setRecipientSearch(e.target.value); setRecipient(null) }}
                style={{ ...inp, flex: 1 }} />
              <button onClick={searchRecipient} disabled={searching || !recipientSearch}
                style={{ background: recipientSearch ? '#1A1A1A' : '#E5E0D8', color: recipientSearch ? '#fff' : '#AAA', border: 'none', borderRadius: '8px', padding: '0 18px', fontSize: '13px', fontWeight: 600, cursor: recipientSearch ? 'pointer' : 'not-allowed', flexShrink: 0 }}>
                {searching ? '...' : 'Find'}
              </button>
            </div>
            {recipient && (
              <div style={{ marginTop: '10px', padding: '12px', background: '#F0FFF4', border: '1px solid #9AE6B4', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#C9A84C', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '14px', flexShrink: 0 }}>
                  {recipient.full_name?.[0]}
                </div>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#1A1A1A', margin: 0 }}>{recipient.full_name}</p>
                  <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>@{recipient.gift_handle}</p>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: '12px', fontWeight: 700, color: '#38a169' }}>✓ Found</span>
              </div>
            )}
          </div>

          {/* Surprise toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', border: '1px solid #E5E0D8', borderRadius: '10px', padding: '14px 16px' }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#1A1A1A', margin: '0 0 2px' }}>Surprise event 🤫</p>
              <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>Recipient won't see contributions until you reveal</p>
            </div>
            <button onClick={() => setIsSurprise(!isSurprise)}
              style={{ width: '44px', height: '24px', borderRadius: '99px', background: isSurprise ? '#C9A84C' : '#E5E0D8', border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}>
              <div style={{ position: 'absolute', top: '3px', left: isSurprise ? '23px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
            </button>
          </div>

          {error && (
            <div style={{ background: '#FFF0F0', border: '1px solid #FFCCCC', borderRadius: '8px', padding: '12px', color: '#CC3333', fontSize: '13px' }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button onClick={createEvent} disabled={loading || !title.trim()}
            style={{ width: '100%', background: title.trim() ? '#C9A84C' : '#E5E0D8', color: title.trim() ? '#fff' : '#AAA', fontWeight: 700, border: 'none', borderRadius: '10px', padding: '16px', fontSize: '16px', cursor: title.trim() ? 'pointer' : 'not-allowed', marginTop: '8px' }}>
            {loading ? 'Creating event...' : '🎁 Create Event & Get Link →'}
          </button>

        </div>
      </div>
    </div>
  )
}
