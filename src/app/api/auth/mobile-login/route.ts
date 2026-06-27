import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: Request) {
  const { phone } = await request.json()

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // Find ALL users with this phone number
  // Also try 10-digit fallback for existing Indian users stored without country code
  let { data: profiles } = await admin
    .from('users')
    .select('id, email, phone_verified')
    .eq('phone', phone)

  if (!profiles?.length && phone.startsWith('91') && phone.length === 12) {
    const { data: fallback } = await admin
      .from('users')
      .select('id, email, phone_verified')
      .eq('phone', phone.slice(2))
    if (fallback?.length) {
      profiles = fallback
      // Migrate: update stored number to full international format
      for (const p of fallback) {
        await admin.from('users').update({ phone }).eq('id', p.id)
      }
    }
  }

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ error: 'No account found with this number. Please sign up.' }, { status: 404 })
  }

  // Prefer the account with a real email over synthetic @giftit.app
  const realAccount = profiles.find(p => p.email && !p.email.endsWith('@giftit.app'))
  const ghostAccount = profiles.find(p => !p.email || p.email.endsWith('@giftit.app'))
  const targetProfile = realAccount ?? ghostAccount!

  // If we found a real account AND a ghost account with the same phone → clean up ghost
  if (realAccount && ghostAccount && ghostAccount.id !== realAccount.id) {
    try {
      // Move wallet transactions from ghost → real account
      await admin.from('wallet_transactions')
        .update({ user_id: realAccount.id })
        .eq('user_id', ghostAccount.id)

      // Move events
      await admin.from('events').update({ creator_id: realAccount.id }).eq('creator_id', ghostAccount.id)
      await admin.from('events').update({ recipient_id: realAccount.id }).eq('recipient_id', ghostAccount.id)

      // Move contributions
      await admin.from('contributions').update({ gifter_id: realAccount.id }).eq('gifter_id', ghostAccount.id)

      // Move wallet balance if stored separately
      const { data: ghostWallet } = await admin.from('wallet_balances').select('balance').eq('user_id', ghostAccount.id).maybeSingle()
      if (ghostWallet?.balance && ghostWallet.balance > 0) {
        const { data: realWallet } = await admin.from('wallet_balances').select('balance').eq('user_id', realAccount.id).maybeSingle()
        if (realWallet) {
          await admin.from('wallet_balances').update({ balance: (realWallet.balance ?? 0) + ghostWallet.balance }).eq('user_id', realAccount.id)
        }
        await admin.from('wallet_balances').delete().eq('user_id', ghostAccount.id)
      }

      // Delete ghost from public.users and auth
      await admin.from('users').delete().eq('id', ghostAccount.id)
      await admin.auth.admin.deleteUser(ghostAccount.id)
    } catch (_) {
      // Non-fatal — still let them log in
    }
  }

  // Find auth user for the target account
  const targetEmail = targetProfile.email ?? `${phone}@giftit.app`
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: targetEmail,
  })

  if (linkError || !linkData?.properties?.hashed_token) {
    return NextResponse.json({ error: 'Failed to generate login link' }, { status: 500 })
  }

  return NextResponse.json({ tokenHash: linkData.properties.hashed_token })
}
