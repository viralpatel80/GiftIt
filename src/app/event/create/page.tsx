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

  async function searchRecipient() {
    setSearching(true)
    const q = recipientSearch.trim()
    let query = supabase.from('users').select('id, full_name, gift_handle, gift_numeric_id')
    if (q.startsWith('@')) {
      query = query.eq('gift_handle', q.slice(1))
    } else if (q.includes('@')) {
      query = query.eq('email', q)
    } else {
      query = query.eq('phone', q.startsWith('+91') ? q : `+91${q}`)
    }
    const { data } = await query.single()
    setRecipient(data || null)
    setSearching(false)
  }

  async function createEvent() {
    setLoading(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not signed in'); setLoading(false); return }

    const recipientId = recipient ? recipient.id : user.id  // default: self event

    const { data, error: err } = await supabase.from('events').insert({
      creator_id: user.id,
      recipient_id: recipientId,
      type, title, description: description || null,
      target_amount: targetAmount ? parseFloat(targetAmount) : null,
      event_date: eventDate || null,
      is_surprise: isSurprise,
    }).select().single()

    if (err) { setError(err.message); setLoading(false); return }
    router.push(`/event/${data.id}`)
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <nav className="border-b border-[#1A1A1A] px-6 h-14 flex items-center gap-4 sticky top-0 bg-[#0A0A0A]/90 backdrop-blur z-10">
        <Link href="/dashboard" className="text-[#555] hover:text-white text-sm">← Dashboard</Link>
        <span className="text-[#2A2A2A]">|</span>
        <span className="text-sm font-semibold">Create Event</span>
      </nav>

      <div className="max-w-lg mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold tracking-tight mb-1">New event</h1>
        <p className="text-sm text-[#555] mb-8">Set up a gift pool for any occasion</p>

        <div className="space-y-6">
          {/* Event type */}
          <div>
            <label className="label">Occasion</label>
            <div className="grid grid-cols-4 gap-2">
              {EVENT_TYPES.map(et => (
                <button key={et.value} onClick={() => setType(et.value)}
                  className={`card p-3 text-center transition-all ${type === et.value ? 'border-[#C9A84C]' : 'hover:border-[#333]'}`}>
                  <div className="text-xl mb-1">{et.emoji}</div>
                  <div className="text-[10px] text-[#888]">{et.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="label">Event Title</label>
            <input type="text" className="input" placeholder="Priya's 30th Birthday 🎂"
              value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          {/* Description */}
          <div>
            <label className="label">Description <span className="text-[#444] font-normal normal-case">(optional)</span></label>
            <textarea className="input resize-none h-20" placeholder="A message to gifters..."
              value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          {/* Target + Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Target Amount <span className="text-[#444] font-normal normal-case">(optional)</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555] text-sm">₹</span>
                <input type="number" className="input pl-7" placeholder="25000"
                  value={targetAmount} onChange={e => setTargetAmount(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label">Event Date <span className="text-[#444] font-normal normal-case">(optional)</span></label>
              <input type="date" className="input" value={eventDate} onChange={e => setEventDate(e.target.value)} />
            </div>
          </div>

          {/* Recipient */}
          <div>
            <label className="label">For someone else? <span className="text-[#444] font-normal normal-case">(leave blank for yourself)</span></label>
            <div className="flex gap-2">
              <input type="text" className="input flex-1" placeholder="@handle, phone, or email"
                value={recipientSearch} onChange={e => { setRecipientSearch(e.target.value); setRecipient(null) }} />
              <button className="btn-outline px-4 py-2 text-sm flex-shrink-0" onClick={searchRecipient} disabled={searching || !recipientSearch}>
                {searching ? '...' : 'Find'}
              </button>
            </div>
            {recipient && (
              <div className="mt-2 p-3 bg-[#111] border border-green-500/30 rounded-lg flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#C9A84C] flex items-center justify-center text-black font-bold text-sm">
                  {recipient.full_name?.[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold">{recipient.full_name}</p>
                  <p className="text-xs text-[#555]">@{recipient.gift_handle}</p>
                </div>
                <span className="ml-auto text-xs text-green-400 font-semibold">✓ Found</span>
              </div>
            )}
          </div>

          {/* Surprise toggle */}
          <div className="flex items-center justify-between p-4 card">
            <div>
              <p className="text-sm font-semibold">Surprise event 🤫</p>
              <p className="text-xs text-[#555] mt-0.5">Recipient won't see contributions until you reveal</p>
            </div>
            <button onClick={() => setIsSurprise(!isSurprise)}
              className={`w-11 h-6 rounded-full transition-colors relative ${isSurprise ? 'bg-[#C9A84C]' : 'bg-[#2A2A2A]'}`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${isSurprise ? 'translate-x-6' : 'translate-x-1'}`}/>
            </button>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button className="btn-gold w-full py-3 text-base" onClick={createEvent}
            disabled={loading || !title}>
            {loading ? 'Creating...' : 'Create Event & Get Link →'}
          </button>
        </div>
      </div>
    </div>
  )
}
