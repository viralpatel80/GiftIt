import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Brands available via Qwikcilver/Xoxoday
const BRANDS = [
  { id: 'amazon', name: 'Amazon.in', emoji: '🛍️' },
  { id: 'flipkart', name: 'Flipkart', emoji: '📱' },
  { id: 'myntra', name: 'Myntra', emoji: '👗' },
  { id: 'nykaa', name: 'Nykaa', emoji: '💄' },
  { id: 'pepperfry', name: 'Pepperfry', emoji: '🛋️' },
  { id: 'bookmyshow', name: 'BookMyShow', emoji: '🎟️' },
]

export async function GET() {
  return NextResponse.json({ brands: BRANDS })
}

export async function POST(req: NextRequest) {
  try {
    const { brandId, amount } = await req.json()
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    if (!brandId || !amount || amount < 100) {
      return NextResponse.json({ error: 'Minimum voucher amount is ₹100' }, { status: 400 })
    }

    // Check wallet balance
    const { data: wallet } = await supabase.from('wallet_balances').select('balance').eq('user_id', user.id).single()
    const balance = wallet?.balance ?? 0

    const fee = Math.round(amount * 0.02)   // 2% platform fee
    const totalDebit = amount + fee

    if (balance < totalDebit) {
      return NextResponse.json({ error: `Insufficient balance. You have ₹${balance.toLocaleString('en-IN')}` }, { status: 400 })
    }

    const brand = BRANDS.find(b => b.id === brandId)
    if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 })

    // TODO: Replace with real Qwikcilver API call
    // const qwikcilverResponse = await callQwikcilverAPI(brandId, amount)
    // const voucherCode = qwikcilverResponse.voucherCode
    const voucherCode = `${brandId.toUpperCase()}-${Math.random().toString(36).substr(2,4).toUpperCase()}-${Math.random().toString(36).substr(2,4).toUpperCase()}-${Math.random().toString(36).substr(2,4).toUpperCase()}`

    // Record voucher
    const { data: voucher } = await supabase.from('vouchers').insert({
      user_id: user.id,
      brand_name: brand.name,
      amount,
      voucher_code: voucherCode,
      status: 'active',
    }).select().single()

    // Debit wallet (amount + fee)
    await supabase.from('wallet_transactions').insert({
      user_id: user.id,
      type: 'debit_voucher',
      amount: totalDebit,
      reference_id: voucher.id,
      description: `${brand.name} voucher — ₹${amount.toLocaleString('en-IN')} (incl. ₹${fee} platform fee)`,
    })

    return NextResponse.json({ voucher: { ...voucher, brandEmoji: brand.emoji } })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
