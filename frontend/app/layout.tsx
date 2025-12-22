import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers/Providers'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Verified DEX | Secure AMM on Stacks',
  description: 'A decentralized exchange with verified pool templates, built with Clarity 4 features on Stacks blockchain',
  keywords: ['DEX', 'AMM', 'Stacks', 'Clarity', 'DeFi', 'Swap', 'Liquidity'],
  openGraph: {
    title: 'Verified DEX | Secure AMM on Stacks',
    description: 'Trade with confidence on the most secure DEX on Stacks',
    images: ['/og-image.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </div>
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}