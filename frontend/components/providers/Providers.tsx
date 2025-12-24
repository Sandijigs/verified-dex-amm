'use client'

import { ReactNode } from 'react'
import { WalletConnectProvider } from '@/providers/WalletConnectProvider'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WalletConnectProvider>
      {children}
    </WalletConnectProvider>
  )
}