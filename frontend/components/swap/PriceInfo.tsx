'use client'

import { Info } from 'lucide-react'

interface PriceInfoProps {
  tokenFrom: string
  tokenTo: string
  amountFrom: string
  amountTo: string
  slippage: number
}

export function PriceInfo({
  tokenFrom,
  tokenTo,
  amountFrom,
  amountTo,
  slippage,
}: PriceInfoProps) {
  if (!amountFrom || !amountTo) return null

  const rate = parseFloat(amountTo) / parseFloat(amountFrom)
  const priceImpact = 0.1 // Mock price impact
  const fee = parseFloat(amountFrom) * 0.003

  return (
    <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Rate</span>
        <span>
          1 {tokenFrom} = {rate.toFixed(4)} {tokenTo}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Price Impact</span>
        <span className={priceImpact > 3 ? 'text-destructive' : ''}>
          {priceImpact.toFixed(2)}%
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Fee (0.3%)</span>
        <span>
          {fee.toFixed(6)} {tokenFrom}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Max Slippage</span>
        <span>{slippage}%</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Minimum Received</span>
        <span className="font-medium">
          {(parseFloat(amountTo) * (1 - slippage / 100)).toFixed(6)} {tokenTo}
        </span>
      </div>
    </div>
  )
}