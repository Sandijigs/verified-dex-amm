'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ChevronDown } from 'lucide-react'

interface TokenInputProps {
  token: string
  amount: string
  onTokenChange: (token: string) => void
  onAmountChange: (amount: string) => void
  label: string
  readOnly?: boolean
}

export function TokenInput({
  token,
  amount,
  onTokenChange,
  onAmountChange,
  label,
  readOnly = false,
}: TokenInputProps) {
  const tokens = [
    { symbol: 'STX', name: 'Stacks', logo: '⚡' },
    { symbol: 'TEST', name: 'Test Token', logo: '🪙' },
  ]

  const currentToken = tokens.find((t) => t.symbol === token) || tokens[0]

  return (
    <div className="bg-muted rounded-lg p-4">
      <div className="flex items-center justify-between gap-4">
        <Input
          type="number"
          placeholder="0.0"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          readOnly={readOnly}
          className="border-0 bg-transparent text-2xl font-medium focus-visible:ring-0 p-0"
        />

        <Button
          variant="ghost"
          className="gap-2 min-w-[120px]"
          onClick={() => {
            // In a real app, this would open a token selector modal
            const newToken = token === 'STX' ? 'TEST' : 'STX'
            onTokenChange(newToken)
          }}
        >
          <span className="text-xl">{currentToken.logo}</span>
          <span className="font-medium">{currentToken.symbol}</span>
          <ChevronDown className="w-4 h-4" />
        </Button>
      </div>

      {/* Balance */}
      <div className="flex items-center justify-between mt-2 text-sm text-muted-foreground">
        <span>${amount ? (parseFloat(amount) * 0.5).toFixed(2) : '0.00'}</span>
        <span>Balance: 0.00</span>
      </div>
    </div>
  )
}