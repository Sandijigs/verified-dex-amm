'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TokenInput } from '@/components/swap/TokenInput'
import { SwapButton } from '@/components/swap/SwapButton'
import { SwapSettings } from '@/components/swap/SwapSettings'
import { PriceInfo } from '@/components/swap/PriceInfo'
import { ArrowDownUp, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function SwapPage() {
  const [tokenFrom, setTokenFrom] = useState<string>('STX')
  const [tokenTo, setTokenTo] = useState<string>('TEST')
  const [amountFrom, setAmountFrom] = useState<string>('')
  const [amountTo, setAmountTo] = useState<string>('')
  const [slippage, setSlippage] = useState(0.5)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const handleSwitch = () => {
    setTokenFrom(tokenTo)
    setTokenTo(tokenFrom)
    setAmountFrom(amountTo)
    setAmountTo(amountFrom)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Swap</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSettingsOpen(!settingsOpen)}
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Settings Panel */}
            {settingsOpen && (
              <SwapSettings
                slippage={slippage}
                onSlippageChange={setSlippage}
                onClose={() => setSettingsOpen(false)}
              />
            )}

            {/* From Token */}
            <div>
              <div className="text-sm text-muted-foreground mb-2">From</div>
              <TokenInput
                token={tokenFrom}
                amount={amountFrom}
                onTokenChange={setTokenFrom}
                onAmountChange={setAmountFrom}
                label="From"
              />
            </div>

            {/* Switch Button */}
            <div className="flex justify-center -my-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSwitch}
                className="rounded-full bg-background border-4"
              >
                <ArrowDownUp className="w-4 h-4" />
              </Button>
            </div>

            {/* To Token */}
            <div>
              <div className="text-sm text-muted-foreground mb-2">To</div>
              <TokenInput
                token={tokenTo}
                amount={amountTo}
                onTokenChange={setTokenTo}
                onAmountChange={setAmountTo}
                label="To"
                readOnly
              />
            </div>

            {/* Price Info */}
            <PriceInfo
              tokenFrom={tokenFrom}
              tokenTo={tokenTo}
              amountFrom={amountFrom}
              amountTo={amountTo}
              slippage={slippage}
            />

            {/* Swap Button */}
            <SwapButton
              tokenFrom={tokenFrom}
              tokenTo={tokenTo}
              amountFrom={amountFrom}
              amountTo={amountTo}
              slippage={slippage}
            />
          </CardContent>
        </Card>

        {/* Additional Info */}
        <Card className="mt-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Router Contract</span>
              <a
                href="https://explorer.hiro.so/txid/153effa55df830e34c587453c7a1da8817aba1144551c81b3271c080ebf9f68d?chain=testnet"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-primary hover:underline"
              >
                View on Explorer
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}