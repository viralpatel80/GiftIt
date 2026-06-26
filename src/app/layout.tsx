import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'GiftIt — Gift Money. Shop Freely.',
  description: 'The smarter way to give and receive gifts in India.',
  openGraph: {
    title: 'GiftIt',
    description: 'Gift money for any occasion. Recipients spend it at 300+ Indian brands.',
    url: 'https://giftit.in',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
