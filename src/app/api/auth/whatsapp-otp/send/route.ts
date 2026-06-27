import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  // phone = full international digits, no + (e.g. "919876543210" or "14155551234")
  const { phone } = await request.json()
  const cleaned = phone?.replace(/\D/g, '')

  if (!cleaned || cleaned.length < 7 || cleaned.length > 15) {
    return NextResponse.json({ error: 'Enter a valid phone number' }, { status: 400 })
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString()

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  await admin.from('phone_verifications').delete().eq('phone', cleaned)

  const { error: insertErr } = await admin.from('phone_verifications').insert({
    phone: cleaned,
    otp,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  })
  if (insertErr) return NextResponse.json({ error: 'Failed to create OTP' }, { status: 500 })

  const accountSid = process.env.TWILIO_ACCOUNT_SID!
  const authToken = process.env.TWILIO_AUTH_TOKEN!
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64')

  const twilioRes = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: process.env.TWILIO_WHATSAPP_FROM!,
        To: `whatsapp:+${cleaned}`,
        Body: `Your GiftIt verification code: *${otp}*\n\nValid for 10 minutes. Do not share this code with anyone.`,
      }).toString(),
    }
  )

  if (!twilioRes.ok) {
    const err = await twilioRes.json()
    console.error('Twilio error:', err)
    return NextResponse.json({ error: 'Failed to send WhatsApp message.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
