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

  // Try full number first, then 10-digit fallback for existing Indian users
  const candidates = [phone]
  if (phone.startsWith('91') && phone.length === 12) {
    candidates.push(phone.slice(2)) // try without country code
  }

  let otpRecord: any = null
  for (const candidate of candidates) {
    const { data } = await admin
      .from('phone_verifications')
      .select('*')
      .eq('phone', candidate)
      .eq('otp', otp)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()
    if (data) { otpRecord = data; break }
  }

  if (!otpRecord) {
    return NextResponse.json({ error: 'Invalid or expired code. Try again.' }, { status: 400 })
  }

  await admin.from('phone_verifications').update({ verified: true }).eq('id', otpRecord.id)

  // Check if user already exists — try both formats
  let existingUser: any = null
  for (const candidate of candidates) {
    const { data } = await admin
      .from('users')
      .select('id, email')
      .eq('phone', candidate)
      .maybeSingle()
    if (data) {
      existingUser = data
      // Migrate stored number to full international format if it was 10-digit
      if (candidate !== phone) {
        await admin.from('users').update({ phone }).eq('id', data.id)
      }
      break
    }
  }

  return NextResponse.json({ success: true, isExistingUser: !!existingUser, userId: existingUser?.id })
}
