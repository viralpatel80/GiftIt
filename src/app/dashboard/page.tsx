import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, LogOut } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single()
  const { data: walletData } = await supabase.from('wallet_balances').select('balance').eq('user_id', user.id).single()
  const { data: transactions } = await supabase.from('wallet_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10)
  const { data: myEvents } = await supabase.from('events').select('*, event_totals(total_amount, contributor_count)').eq('recipient_id', user.id).eq('is_active', true).order('created_at', { ascending: false }).limit(5)

  const balance = walletData?.balance ?? 0
  const totalGifted = transactions?.filter(t => t.type.startsWith('debit')).reduce((s, t) => s + t.amount, 0) ?? 0

  return (
    <div style={{ minHeight: '100vh', background: '#F7F4F0' }}>
      {/* Nav */}
      <nav style={{ borderBottom: '1px solid #E5E0D8', padding: '0 24px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '28px', height: '28px', background: '#C9A84C', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>🎁</div>
          <span style={{ fontWeight: 900, fontSize: '15px', letterSpacing: '-0.02em', color: '#1A1A1A' }}>GiftIt</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '12px', color: '#AAA' }}>@{profile?.gift_handle}</span>
          <form action="/api/auth/signout" method="POST">
            <button type="submit" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#AAA', fontSize: '12px', fontWeight: 600 }}>Sign out</button>
          </form>
        </div>
      </nav>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 24px' }}>
        {/* Greeting */}
        <div style={{ marginBottom: '28px' }}>
          <p style={{ fontSize: '13px', color: '#AAA', marginBottom: '4px' }}>Good day,</p>
          <h1 style={{ fontSize: '26px', fontWeight: 900, letterSpacing: '-0.02em', color: '#1A1A1A', marginBottom: '4px' }}>{profile?.full_name || 'Friend'} 👋</h1>
          <p style={{ fontSize: '11px', color: '#BBB', fontFamily: 'monospace' }}>{profile?.gift_numeric_id}</p>
        </div>

        {/* Cards row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '28px' }}>
          {/* Wallet */}
          <div style={{ gridColumn: 'span 2', background: '#fff', border: '1px solid #E5E0D8', borderRadius: '12px', padding: '20px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#C9A84C' }} />
            <p style={{ fontSize: '11px', color: '#AAA', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Wallet Balance</p>
            <p style={{ fontSize: '36px', fontWeight: 900, letterSpacing: '-0.03em', color: '#1A1A1A', marginBottom: '4px' }}>₹{balance.toLocaleString('en-IN')}</p>
            <p style={{ fontSize: '12px', color: '#BBB', marginBottom: '16px' }}>Spend at 300+ brands · voucher on demand</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <Link href="/redeem" style={{ background: '#C9A84C', color: '#fff', fontWeight: 700, borderRadius: '8px', padding: '8px 16px', fontSize: '13px', textDecoration: 'none' }}>Redeem →</Link>
              <Link href="/p2p" style={{ background: '#fff', color: '#1A1A1A', fontWeight: 600, borderRadius: '8px', padding: '8px 16px', fontSize: '13px', textDecoration: 'none', border: '1px solid #E5E0D8' }}>Send Gift ⚡</Link>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: '#fff', border: '1px solid #E5E0D8', borderRadius: '12px', padding: '16px', textAlign: 'center', flex: 1 }}>
              <p style={{ fontSize: '20px', fontWeight: 900, color: '#1A1A1A' }}>₹{totalGifted.toLocaleString('en-IN')}</p>
              <p style={{ fontSize: '11px', color: '#AAA', marginTop: '4px' }}>Total gifted out</p>
            </div>
            <div style={{ background: '#fff', border: '1px solid #E5E0D8', borderRadius: '12px', padding: '16px', textAlign: 'center', flex: 1 }}>
              <p style={{ fontSize: '20px', fontWeight: 900, color: '#1A1A1A' }}>{myEvents?.length ?? 0}</p>
              <p style={{ fontSize: '11px', color: '#AAA', marginTop: '4px' }}>Active events</p>
            </div>
          </div>
        </div>

        {/* My Events */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#AAA' }}>My Events</h2>
            <Link href="/event/create" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#C9A84C', textDecoration: 'none', fontWeight: 600 }}>
              <Plus size={12}/> Create event
            </Link>
          </div>
          {myEvents && myEvents.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {myEvents.map((event: any) => (
                <Link key={event.id} href={`/event/${event.id}`}
                  style={{ background: '#fff', border: '1px solid #E5E0D8', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px', textDecoration: 'none' }}>
                  <div style={{ fontSize: '20px' }}>{eventEmoji(event.type)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#1A1A1A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.title}</p>
                    <p style={{ fontSize: '12px', color: '#AAA' }}>{event.event_totals?.contributor_count ?? 0} contributors</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: '#C9A84C' }}>₹{(event.event_totals?.total_amount ?? 0).toLocaleString('en-IN')}</p>
                    {event.target_amount && (
                      <p style={{ fontSize: '11px', color: '#BBB' }}>of ₹{event.target_amount.toLocaleString('en-IN')}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div style={{ background: '#fff', border: '1px solid #E5E0D8', borderRadius: '12px', padding: '32px', textAlign: 'center' }}>
              <p style={{ color: '#BBB', fontSize: '14px', marginBottom: '12px' }}>No active events yet</p>
              <Link href="/event/create" style={{ background: '#C9A84C', color: '#fff', fontWeight: 700, borderRadius: '8px', padding: '8px 18px', fontSize: '13px', textDecoration: 'none', display: 'inline-block' }}>Create your first event</Link>
            </div>
          )}
        </div>

        {/* Activity */}
        <div>
          <h2 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#AAA', marginBottom: '14px' }}>Recent Activity</h2>
          {transactions && transactions.length > 0 ? (
            <div style={{ background: '#fff', border: '1px solid #E5E0D8', borderRadius: '12px', overflow: 'hidden' }}>
              {transactions.map((tx: any, i: number) => (
                <div key={tx.id} style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: i < transactions.length - 1 ? '1px solid #F0EDE8' : 'none' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#F7F4F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
                    {txIcon(tx.type)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: 500, color: '#1A1A1A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.description}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                      <span style={{ fontSize: '11px', color: '#BBB' }}>{new Date(tx.created_at).toLocaleDateString('en-IN')}</span>
                      <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', ...txBadgeStyle(tx.type) }}>{txLabel(tx.type)}</span>
                    </div>
                  </div>
                  <p style={{ fontSize: '14px', fontWeight: 700, flexShrink: 0, color: tx.type.startsWith('credit') ? '#38a169' : '#888' }}>
                    {tx.type.startsWith('credit') ? '+' : '−'}₹{tx.amount.toLocaleString('en-IN')}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ background: '#fff', border: '1px solid #E5E0D8', borderRadius: '12px', padding: '32px', textAlign: 'center' }}>
              <p style={{ color: '#BBB', fontSize: '14px' }}>No activity yet. Start by creating an event or sending a gift!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function eventEmoji(type: string) {
  const map: Record<string,string> = { birthday:'🎂', baby_shower:'👶', wedding:'💍', housewarming:'🏠', graduation:'🎓', anniversary:'💕', festival:'🪔', custom:'✨' }
  return map[type] ?? '🎁'
}
function txIcon(type: string) {
  if (type === 'credit_event') return '🎁'
  if (type === 'credit_p2p') return '⚡'
  if (type === 'debit_voucher') return '🛍️'
  if (type === 'debit_p2p') return '💸'
  return '•'
}
function txLabel(type: string) {
  if (type.includes('event')) return 'EVENT'
  if (type.includes('p2p')) return 'P2P'
  if (type.includes('voucher')) return 'SPEND'
  return ''
}
function txBadgeStyle(type: string) {
  if (type.includes('event')) return { background: '#f3e8ff', color: '#7c3aed' }
  if (type.includes('p2p')) return { background: '#fef9ec', color: '#C9A84C' }
  if (type.includes('voucher')) return { background: '#ebf8ff', color: '#3182ce' }
  return {}
}
