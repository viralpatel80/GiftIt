export type User = {
  id: string
  phone: string | null
  email: string | null
  full_name: string
  gift_handle: string      // @handle
  gift_numeric_id: string  // GIFT-XXXX-XXXX
  avatar_url: string | null
  created_at: string
}

export type Event = {
  id: string
  creator_id: string
  recipient_id: string
  type: 'birthday' | 'baby_shower' | 'wedding' | 'housewarming' | 'graduation' | 'anniversary' | 'festival' | 'custom'
  title: string
  description: string | null
  target_amount: number | null
  is_surprise: boolean
  is_active: boolean
  event_date: string | null
  created_at: string
  recipient?: User
  creator?: User
  total_contributions?: number
  contributor_count?: number
}

export type Contribution = {
  id: string
  event_id: string
  gifter_name: string
  gifter_email: string | null
  gifter_user_id: string | null
  amount: number
  message: string | null
  razorpay_payment_id: string | null
  status: 'pending' | 'captured' | 'failed'
  created_at: string
}

export type WalletTransaction = {
  id: string
  user_id: string
  type: 'credit_event' | 'credit_p2p' | 'debit_voucher' | 'debit_p2p'
  amount: number
  reference_id: string | null
  description: string
  created_at: string
}

export type Voucher = {
  id: string
  user_id: string
  brand_name: string
  amount: number
  voucher_code: string
  status: 'active' | 'used' | 'cancelled'
  issued_at: string
}
