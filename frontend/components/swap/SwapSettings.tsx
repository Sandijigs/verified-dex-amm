'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X } from 'lucide-react'

interface SwapSettingsProps {
  slippage: number
  onSlippageChange: (slippage: number) => void
  onClose: () => void
}

export function SwapSettings({ slippage, onSlippageChange, onClose }: SwapSettingsProps) {
  const presetSlippages = [0.1, 0.5, 1.0]

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Transaction Settings</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">
            Slippage Tolerance
          </label>
          <div className="flex gap-2">
            {presetSlippages.map((preset) => (
              <Button
                key={preset}
                variant={slippage === preset ? 'default' : 'outline'}
                size="sm"
                onClick={() => onSlippageChange(preset)}
              >
                {preset}%
              </Button>
            ))}
            <div className="flex items-center gap-1">
              <Input
                type="number"
                value={slippage}
                onChange={(e) => onSlippageChange(parseFloat(e.target.value) || 0)}
                className="w-20"
                min="0"
                max="50"
                step="0.1"
              />
              <span className="text-sm">%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}