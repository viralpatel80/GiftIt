import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: Request) {
  try {
    const { mobileUserId, email, confirm } = await request.json()
    if (!mobileUserId || !email) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 })
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Find the email account in public.users
    const { data: emailUser, error: emailUserErr } = await admin
      .from('users')
      .select('id, full_name, gift_handle, gift_numeric_id, phone, phone_verified, email')
      .eq('email', email)
      .maybeSingle()

    if (emailUserErr) return NextResponse.json({ error: emailUserErr.message }, { status: 500 })
    if (!emailUser) return NextResponse.json({ exists: false })

    // Preview mode — just return info so UI can confirm
    if (!confirm) {
      return NextResponse.json({
        exists: true,
        emailAccountName: emailUser.full_name,
        emailAccountHandle: emailUser.gift_handle,
        emailAccountId: emailUser.id,
      })
    }

    // ── CONFIRMED MERGE ──────────────────────────────────────────
    // Get mobile user's profile
    const { data: mobileUser } = await admin
      .from('users')
      .select('phone, phone_verified, gift_numeric_id')
      .eq('id', mobileUserId)
      .single()

    const phone = mobileUser?.phone
    const phoneVerified = mobileUser?.phone_verified

    // 1. Copy phone to email account
    await admin.from('users')
      .update({ phone, phone_verified: phoneVerified })
      .eq('id', emailUser.id)

    // 2. Move wallet transactions
    await admin.from('wallet_transactions')
      .update({ user_id: emailUser.id })
      .eq('user_id', mobileUserId)

    // 3. Move wallet balance (in case it's a separate table, not a view)
    const { data: mobileWallet } = await admin
      .from('wallet_balances')
      .select('balance')
      .eq('user_id', mobileUserId)
      .maybeSingle()

    if (mobileWallet?.balance && mobileWallet.balance > 0) {
      const { data: emailWallet } = await admin
        .from('wallet_balances')
        .select('balance')
        .eq('user_id', emailUser.id)
        .maybeSingle()

      if (emailWallet) {
        await admin.from('wallet_balances')
          .update({ balance: (emailWallet.balance ?? 0) + mobileWallet.balance })
          .eq('user_id', emailUser.id)
      }
      // Delete mobile wallet row
      await admin.from('wallet_balances').delete().eq('user_id', mobileUserId)
    }

    // 4. Move events (where creator or recipient is mobile user)
    await admin.from('events').update({ creator_id: emailUser.id }).eq('creator_id', mobileUserId)
    await admin.from('events').update({ recipient_id: emailUser.id }).eq('recipient_id', mobileUserId)

    // 5. Move contributions
    await admin.from('contributions').update({ gifter_id: emailUser.id }).eq('gifter_id', mobileUserId)

    // 6. Delete mobile user record from public.users
    await admin.from('users').delete().eq('id', mobileUserId)

    // 7. Delete mobile auth user
    await admin.auth.admin.deleteUser(mobileUserId)

    // 8. Generate magic link for email account so client can sign in as email user
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo: `${new URL(request.url).origin}/auth/callback` }
    })

    if (linkErr || !linkData?.properties?.hashed_token) {
      return NextResponse.json({ error: linkErr?.message ?? 'Failed to generate session' }, { status: 500 })
    }

    return NextResponse.json({
      merged: true,
      tokenHash: linkData.properties.hashed_token,
      emailAccountHandle: emailUser.gift_handle,
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
