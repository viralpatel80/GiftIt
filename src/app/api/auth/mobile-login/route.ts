import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { phone } = await request.json()
  const origin = new URL(request.url).origin

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Find user by phone in public.users
  const { data: profile } = await admin
    .from('users')
    .select('id, email')
    .eq('phone', phone)
    .single()

  // Also check synthetic email users (phone-first signups)
  const syntheticEmail = `${phone}@giftit.app`
  const { data: authUsers } = await admin.auth.admin.listUsers()
  const authUser = authUsers?.users?.find(
    u => u.email === syntheticEmail || (profile && u.id === profile.id)
  )

  if (!authUser) {
    return NextResponse.json({ error: 'No account found with this number. Please sign up.' }, { status: 404 })
  }

  // Generate magic link for login
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: authUser.email!,
    options: { redirectTo: `${origin}/auth/callback` },
  })

  if (linkError || !linkData?.properties?.action_link) {
    return NextResponse.json({ error: 'Failed to generate login link' }, { status: 500 })
  }

  return NextResponse.json({ actionLink: linkData.properties.action_link })
}
