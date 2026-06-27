import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { email, phone } = await request.json()
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  if (email) {
    const { data } = await admin.from('users').select('id').eq('email', email).maybeSingle()
    return NextResponse.json({ exists: !!data })
  }

  if (phone) {
    // Try exact match first, then 10-digit fallback for existing Indian users
    const { data } = await admin.from('users').select('id').eq('phone', phone).maybeSingle()
    if (data) return NextResponse.json({ exists: true })

    if (phone.startsWith('91') && phone.length === 12) {
      const { data: fallback } = await admin.from('users').select('id').eq('phone', phone.slice(2)).maybeSingle()
      return NextResponse.json({ exists: !!fallback })
    }

    return NextResponse.json({ exists: false })
  }

  return NextResponse.json({ exists: false })
}
