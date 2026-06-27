import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { phone, otp } = await request.json()

  if (!phone || !otp) {
    return NextResponse.json({ error: 'Phone and OTP required' }, { status: 400 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await admin
    .from('phone_verifications')
    .select('*')
    .eq('phone', phone)
    .eq('otp', otp)
    .eq('verified', false)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Invalid or expired code. Try again.' }, { status: 400 })
  }

  // Mark verified
  await admin.from('phone_verifications').update({ verified: true }).eq('id', data.id)

  // Check if user already exists with this phone
  const { data: existingUser } = await admin
    .from('users')
    .select('id, email')
    .eq('phone', phone)
    .single()

  return NextResponse.json({ success: true, isExistingUser: !!existingUser, userId: existingUser?.id })
}
