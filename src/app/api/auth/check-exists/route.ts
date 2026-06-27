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
    const { data } = await admin.from('users').select('id').eq('phone', phone).maybeSingle()
    return NextResponse.json({ exists: !!data })
  }
  return NextResponse.json({ exists: false })
}
