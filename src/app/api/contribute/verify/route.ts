import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { contributionId, razorpayPaymentId, razorpayOrderId, razorpaySignature } = await req.json()

    // Verify Razorpay signature
    const body = razorpayOrderId + '|' + razorpayPaymentId
    const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!).update(body).digest('hex')
    if (expected !== razorpaySignature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const supabase = createClient()

    // Get the contribution
    const { data: contrib } = await supabase.from('contributions').select('*, events(recipient_id)').eq('id', contributionId).single()
    if (!contrib) return NextResponse.json({ error: 'Contribution not found' }, { status: 404 })

    // Mark as captured
    await supabase.from('contributions').update({
      status: 'captured',
      razorpay_payment_id: razorpayPaymentId,
    }).eq('id', contributionId)

    // Credit recipient wallet
    await supabase.from('wallet_transactions').insert({
      user_id: contrib.events.recipient_id,
      type: 'credit_event',
      amount: contrib.amount,
      reference_id: contributionId,
      description: `Gift from ${contrib.gifter_name}${contrib.message ? ` — "${contrib.message}"` : ''}`,
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
