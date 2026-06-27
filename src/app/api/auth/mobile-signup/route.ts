import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { phone } = await request.json()
  const origin = new URL(request.url).origin

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const syntheticEmail = `${phone}@giftit.app`

  // Check if user already exists
  const { data: existingAuthUser } = await admin.auth.admin.listUsers()
  const found = existingAuthUser?.users?.find(u => u.email === syntheticEmail)

  let userId: string

  if (found) {
    userId = found.id
  } else {
    // Create new Supabase auth user
    const { data: newUser, error } = await admin.auth.admin.createUser({
      email: syntheticEmail,
      email_confirm: true,
      user_metadata: { phone, is_phone_signup: true },
    })
    if (error || !newUser.user) {
      return NextResponse.json({ error: 'Failed to create account: ' + error?.message }, { status: 500 })
    }
    userId = newUser.user.id
  }

  // Generate magic link → client follows it → session created
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: syntheticEmail,
    options: { redirectTo: `${origin}/auth/callback?phone_signup=true&phone=${phone}` },
  })

  if (linkError || !linkData?.properties?.action_link) {
    return NextResponse.json({ error: 'Failed to generate login link' }, { status: 500 })
  }

  return NextResponse.json({ actionLink: linkData.properties.action_link })
}
