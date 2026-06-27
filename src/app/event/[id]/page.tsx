import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import GiftForm from './GiftForm'

export default async function EventPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data: event } = await supabase
    .from('events')
    .select('*, recipient:users!recipient_id(full_name, gift_handle, gift_numeric_id), creator:users!creator_id(full_name)')
    .eq('id', params.id)
    .single()

  if (!event) notFound()

  const { data: totals } = await supabase
    .from('event_totals')
    .select('*')
    .eq('event_id', params.id)
    .single()

  const { data: contributions } = await supabase
    .from('contributions')
    .select('gifter_name, amount, message, created_at')
    .eq('event_id', params.id)
    .eq('status', 'captured')
    .order('created_at', { ascending: false })
    .limit(20)

  const totalAmount = totals?.total_amount ?? 0
  const contributorCount = totals?.contributor_count ?? 0
  const pct = event.target_amount ? Math.min(100, (totalAmount / event.target_amount) * 100) : null

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <nav className="border-b border-[#1A1A1A] px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#C9A84C] rounded-md flex items-center justify-center text-sm">🎁</div>
          <span className="font-black tracking-tight text-sm">GiftIt</span>
        </div>
        <a href="/dashboard" style={{ fontSize: '13px', fontWeight: 600, color: '#C9A84C', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
          ← Dashboard
        </a>
      </nav>

      <div className="max-w-lg mx-auto px-6 py-8">
        {/* Event header */}
        <div className="card p-6 mb-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#C9A84C]"/>
          <p className="text-xs text-[#C9A84C] font-semibold uppercase tracking-wider mb-1">{eventLabel(event.type)}</p>
          <h1 className="text-2xl font-bold tracking-tight mb-1">{event.title}</h1>
          {event.description && <p className="text-sm text-[#666] mb-4">{event.description}</p>}

          <div className="mb-1">
            <p className="text-xs text-[#555] uppercase tracking-wider mb-1">Gift Pool</p>
            <p className="text-4xl font-black tracking-tight">₹{totalAmount.toLocaleString('en-IN')}</p>
          </div>

          {pct !== null && (
            <div className="mt-3">
              <div className="h-1 bg-[#1A1A1A] rounded-full">
                <div className="h-full bg-[#C9A84C] rounded-full transition-all" style={{ width: `${pct}%` }}/>
              </div>
              <div className="flex justify-between mt-1 text-xs text-[#555]">
                <span>{contributorCount} friends gifted</span>
                <span>Goal ₹{event.target_amount?.toLocaleString('en-IN')}</span>
              </div>
            </div>
          )}
          {pct === null && <p className="text-xs text-[#555] mt-2">{contributorCount} people have gifted</p>}

          <div className="mt-4 pt-4 border-t border-[#1A1A1A] flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#C9A84C] flex items-center justify-center text-black font-bold text-xs">
              {event.recipient?.full_name?.[0]}
            </div>
            <div>
              <p className="text-xs font-semibold">{event.recipient?.full_name}</p>
              <p className="text-[10px] text-[#555]">@{event.recipient?.gift_handle}</p>
            </div>
          </div>
        </div>

        {/* Gift form */}
        <GiftForm eventId={event.id} eventTitle={event.title} recipientName={event.recipient?.full_name} />

        {/* Contributions */}
        {contributions && contributions.length > 0 && (
          <div className="mt-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#555] mb-3">Gift Wall 💝</h3>
            <div className="card divide-y divide-[#1A1A1A]">
              {contributions.map((c: any, i: number) => (
                <div key={i} className="p-4 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center text-xs font-bold flex-shrink-0 text-[#C9A84C]">
                    {c.gifter_name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{c.gifter_name}</p>
                    {c.message && <p className="text-xs text-[#666] mt-0.5 italic">"{c.message}"</p>}
                  </div>
                  <p className="text-sm font-bold text-[#C9A84C] flex-shrink-0">+₹{c.amount.toLocaleString('en-IN')}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function eventLabel(type: string) {
  const map: Record<string,string> = { birthday:'🎂 Birthday', baby_shower:'👶 Baby Shower', wedding:'💍 Wedding', housewarming:'🏠 Housewarming', graduation:'🎓 Graduation', anniversary:'💕 Anniversary', festival:'🪔 Festival', custom:'✨ Event' }
  return map[type] ?? '🎁 Gift Event'
}
