import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const cookieStore = cookies()
  const supabase = createServerClient(
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

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { recipientHandle, amount, note } = await request.json()
  if (!recipientHandle || !amount || amount < 1) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // Find recipient by handle, numeric ID, or email
  const handle = recipientHandle.replace(/^@/, '').toLowerCase()
  const isEmail = recipientHandle.includes('@') && recipientHandle.includes('.')
  const { data: recipient } = await supabase
    .from('users')
    .select('id, full_name, gift_handle, gift_numeric_id')
    .or(isEmail
      ? `email.eq.${recipientHandle.toLowerCase()}`
      : `gift_handle.eq.${handle},gift_numeric_id.eq.${recipientHandle.toUpperCase()}`
    )
    .single()

  if (!recipient) return NextResponse.json({ error: 'User not found. Check the @handle or GIFT ID.' }, { status: 404 })
  if (recipient.id === user.id) return NextResponse.json({ error: 'You cannot send money to yourself.' }, { status: 400 })

  // Check sender balance (wallet_balances is a view — read only)
  const { data: senderWallet } = await supabase
    .from('wallet_balances').select('balance').eq('user_id', user.id).single()
  const senderBalance = senderWallet?.balance ?? 0
  if (senderBalance < amount) {
    return NextResponse.json({ error: `Insufficient balance. You have ₹${senderBalance.toLocaleString('en-IN')}.` }, { status: 400 })
  }

  const { data: senderProfile } = await supabase.from('users').select('full_name, gift_handle').eq('id', user.id).single()
  const receiveNote = `Gift from @${senderProfile?.gift_handle}${note ? ': ' + note : ''}`

  // All balance changes go through wallet_transactions — the view recalculates automatically
  const { error: debitErr } = await supabase.from('wallet_transactions').insert({
    user_id: user.id, type: 'debit_p2p', amount,
    description: `Sent ₹${amount.toLocaleString('en-IN')} to @${recipient.gift_handle}${note ? ' · ' + note : ''}`
  })
  if (debitErr) return NextResponse.json({ error: 'Transfer failed. Try again.' }, { status: 500 })

  await supabase.from('wallet_transactions').insert({
    user_id: recipient.id, type: 'credit_p2p', amount,
    description: receiveNote
  })

  return NextResponse.json({ success: true, recipient: { name: recipient.full_name, handle: recipient.gift_handle }, amount })
}
