import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const cookieStore = cookies()

  // Auth client (anon key) — only used to verify the logged-in user
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { recipientHandle, amount, note } = await request.json()
  if (!recipientHandle || !amount || amount < 1) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // Service role client — bypasses RLS for cross-user writes
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Server config error: missing service role key' }, { status: 500 })
  }
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Find recipient by email, handle, or numeric ID
  const cleaned = recipientHandle.trim()
  const stripped = cleaned.startsWith('@') ? cleaned.slice(1) : cleaned
  const isEmail = stripped.includes('@') && stripped.includes('.')
  const handle = stripped.toLowerCase()

  let recipient = null
  if (isEmail) {
    const { data } = await admin.from('users').select('id, full_name, gift_handle').eq('email', stripped.toLowerCase()).single()
    recipient = data
  } else if (stripped.toUpperCase().startsWith('GIFT-')) {
    const { data } = await admin.from('users').select('id, full_name, gift_handle').eq('gift_numeric_id', stripped.toUpperCase()).single()
    recipient = data
  } else {
    const { data } = await admin.from('users').select('id, full_name, gift_handle').eq('gift_handle', handle).single()
    recipient = data
  }

  if (!recipient) return NextResponse.json({ error: 'User not found. Check the @handle, email, or GIFT ID.' }, { status: 404 })
  if (recipient.id === user.id) return NextResponse.json({ error: 'You cannot send money to yourself.' }, { status: 400 })

  // Check sender balance via admin (avoids RLS on view)
  const { data: senderWallet } = await admin.from('wallet_balances').select('balance').eq('user_id', user.id).single()
  const senderBalance = senderWallet?.balance ?? 0
  if (senderBalance < amount) {
    return NextResponse.json({ error: `Insufficient balance. You have ₹${senderBalance.toLocaleString('en-IN')}.` }, { status: 400 })
  }

  const { data: senderProfile } = await admin.from('users').select('gift_handle').eq('id', user.id).single()
  const receiveNote = `Gift from @${senderProfile?.gift_handle}${note ? ': ' + note : ''}`

  // Debit sender
  const { error: debitErr } = await admin.from('wallet_transactions').insert({
    user_id: user.id, type: 'debit_p2p', amount,
    description: `Sent ₹${amount.toLocaleString('en-IN')} to @${recipient.gift_handle}${note ? ' · ' + note : ''}`
  })
  if (debitErr) return NextResponse.json({ error: 'Transfer failed: ' + debitErr.message }, { status: 500 })

  // Credit recipient
  const { error: creditErr } = await admin.from('wallet_transactions').insert({
    user_id: recipient.id, type: 'credit_p2p', amount,
    description: receiveNote
  })
  if (creditErr) return NextResponse.json({ error: 'Partial failure — debit succeeded but credit failed.' }, { status: 500 })

  return NextResponse.json({ success: true, recipient: { name: recipient.full_name, handle: recipient.gift_handle }, amount })
}
