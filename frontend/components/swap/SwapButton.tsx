'use client'

import { Button } from '@/components/ui/button'
import { useWallet } from '@/hooks/useWallet'
import { ArrowRight } from 'lucide-react'

interface SwapButtonProps {
  tokenFrom: string
  tokenTo: string
  amountFrom: string
  amountTo: string
  slippage: number
}

export function SwapButton({
  tokenFrom,
  tokenTo,
  amountFrom,
  amountTo,
  slippage,
}: SwapButtonProps) {
  const { isConnected } = useWallet()

  if (!isConnected) {
    return (
      <Button size="lg" className="w-full" disabled>
        Connect Wallet
      </Button>
    )
  }

  if (!amountFrom || parseFloat(amountFrom) === 0) {
    return (
      <Button size="lg" className="w-full" disabled>
        Enter an amount
      </Button>
    )
  }

  return (
    <Button
      size="lg"
      className="w-full gap-2"
      onClick={() => {
        // TODO: Implement swap
        console.log('Swap:', { tokenFrom, tokenTo, amountFrom, amountTo, slippage })
      }}
    >
      Swap {tokenFrom} for {tokenTo}
      <ArrowRight className="w-4 h-4" />
    </Button>
  )
}