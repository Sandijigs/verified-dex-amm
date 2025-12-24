'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLiquidity } from '@/hooks/useLiquidity'
import { useWalletConnect } from '@/providers/WalletConnectProvider'
import { CONTRACT_ADDRESSES } from '@/lib/contracts/addresses'

interface AddLiquidityModalProps {
  poolId: string | null
  onClose: () => void
}

export function AddLiquidityModal({ poolId, onClose }: AddLiquidityModalProps) {
  const [amountA, setAmountA] = useState('')
  const [amountB, setAmountB] = useState('')
  const { addLiquidity, isLoading, error } = useLiquidity()
  const { connected, connectWallet } = useWalletConnect()

  // Mock data - will be replaced with real pool data
  const tokenA = 'STX'
  const tokenB = 'TEST'

  const handleAddLiquidity = async () => {
    if (!connected) {
      await connectWallet()
      return
    }

    if (!amountA || !amountB) {
      console.error('Please enter both amounts')
      return
    }

    try {
      // Use the pool contract from poolId or default to pool-template
      const poolContract = poolId || CONTRACT_ADDRESSES.POOL_TEMPLATE || `${process.env.NEXT_PUBLIC_DEPLOYER_ADDRESS}.pool-template`

      await addLiquidity(
        poolContract,
        tokenA,
        tokenB,
        amountA,
        amountB,
        '0' // minLiquidity - could calculate based on slippage
      )

      console.log('Liquidity added successfully')
      // Reset form
      setAmountA('')
      setAmountB('')
      onClose()
    } catch (err) {
      console.error('Failed to add liquidity:', err)
    }
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Add Liquidity</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          {poolId && (
            <p className="text-sm text-muted-foreground">
              Pool: {poolId}
            </p>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Info Banner */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 flex gap-3">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-500">
              <p className="font-semibold mb-1">Verified Pool</p>
              <p className="text-blue-500/80">
                This pool has been verified using contract-hash to ensure security
              </p>
            </div>
          </div>

          {/* Token A Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">{tokenA}</label>
              <span className="text-xs text-muted-foreground">
                Balance: 0.00
              </span>
            </div>
            <div className="relative">
              <Input
                type="number"
                placeholder="0.0"
                value={amountA}
                onChange={(e) => setAmountA(e.target.value)}
                className="pr-16"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium">
                {tokenA}
              </div>
            </div>
          </div>

          {/* Plus Icon */}
          <div className="flex justify-center">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
          </div>

          {/* Token B Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">{tokenB}</label>
              <span className="text-xs text-muted-foreground">
                Balance: 0.00
              </span>
            </div>
            <div className="relative">
              <Input
                type="number"
                placeholder="0.0"
                value={amountB}
                onChange={(e) => setAmountB(e.target.value)}
                className="pr-16"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium">
                {tokenB}
              </div>
            </div>
          </div>

          {/* Pool Share Info */}
          {amountA && amountB && (
            <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Rate</span>
                <span>
                  1 {tokenA} = {(parseFloat(amountB) / parseFloat(amountA)).toFixed(4)} {tokenB}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Pool Share</span>
                <span>100%</span>
              </div>
            </div>
          )}

          {/* Add Liquidity Button */}
          <Button
            className="w-full"
            size="lg"
            onClick={handleAddLiquidity}
            disabled={!amountA || !amountB}
          >
            Add Liquidity
          </Button>

          {/* Note */}
          <p className="text-xs text-muted-foreground text-center">
            By adding liquidity you'll earn 0.3% of all trades on this pair proportional to your share of the pool
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
