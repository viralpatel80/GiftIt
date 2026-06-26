import { NextRequest, NextResponse } from 'next/server'
import Razorpay from 'razorpay'
import { createClient } from '@/lib/supabase/server'

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

export async function POST(req: NextRequest) {
  try {
    const { eventId, amount, gifterName, gifterEmail, message } = await req.json()

    if (!eventId || !amount || amount < 1 || !gifterName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createClient()

    // Verify event exists and is active
    const { data: event } = await supabase.from('events').select('id, is_active').eq('id', eventId).single()
    if (!event?.is_active) return NextResponse.json({ error: 'Event not found or inactive' }, { status: 404 })

    // Create Razorpay order (amount in paise)
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: `gift_${Date.now()}`,
    })

    // Create pending contribution record
    const { data: contribution } = await supabase.from('contributions').insert({
      event_id: eventId,
      gifter_name: gifterName,
      gifter_email: gifterEmail || null,
      amount,
      message: message || null,
      razorpay_order_id: order.id,
      status: 'pending',
    }).select().single()

    return NextResponse.json({
      razorpayOrderId: order.id,
      amount: order.amount,
      contributionId: contribution.id,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
