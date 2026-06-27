import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const isPhoneSignup = searchParams.get('phone_signup') === 'true'
  const phone = searchParams.get('phone')

  if (code) {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && user) {
      // Only create profile + wallet if new user
      const { data: existingUser } = await supabase.from('users').select('id').eq('id', user.id).single()
      if (!existingUser) {
        await supabase.from('users').insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || '',
          phone: phone || user.user_metadata?.phone || null,
          phone_verified: isPhoneSignup,
          gift_handle: 'user_' + user.id.substring(0, 8),
          gift_numeric_id: 'GIFT-' + Math.floor(1000 + Math.random() * 9000) + '-' + Math.floor(1000 + Math.random() * 9000)
        })
        await supabase.from('wallet_transactions').insert({
          user_id: user.id, type: 'credit_event', amount: 5000,
          description: '🎉 Welcome to GiftIt! ₹5,000 gift credit added to your wallet'
        })

        // Phone-first signup → complete profile (name + handle)
        if (isPhoneSignup) {
          return NextResponse.redirect(`${origin}/profile/complete?phone=${phone}`)
        }
      }

      return NextResponse.redirect(`${origin}/dashboard`)
    }
  }

  return NextResponse.redirect(`${origin}/login`)
}
