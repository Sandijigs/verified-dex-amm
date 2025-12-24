'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TrendingUp, Droplet } from 'lucide-react'

interface Pool {
  id: string
  tokenA: string
  tokenB: string
  tvl: string
  volume24h: string
  fees24h: string
  apy: string
}

// Mock data - will be replaced with real data from contracts
const mockPools: Pool[] = [
  {
    id: 'STX-TEST',
    tokenA: 'STX',
    tokenB: 'TEST',
    tvl: '$0.00',
    volume24h: '$0.00',
    fees24h: '$0.00',
    apy: '0.00%',
  },
]

interface PoolListProps {
  onSelectPool: (poolId: string) => void
}

export function PoolList({ onSelectPool }: PoolListProps) {
  return (
    <div className="space-y-4">
      {mockPools.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Droplet className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No pools available yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {mockPools.map((pool) => (
            <Card key={pool.id} className="p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                {/* Pool Info */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">
                      {pool.tokenA.substring(0, 2)}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center text-xs font-bold -ml-2">
                      {pool.tokenB.substring(0, 2)}
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold">
                      {pool.tokenA}/{pool.tokenB}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Verified Pool
                    </div>
                  </div>
                </div>

                {/* Pool Stats */}
                <div className="hidden md:flex gap-8">
                  <div>
                    <div className="text-xs text-muted-foreground">TVL</div>
                    <div className="font-semibold">{pool.tvl}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">24h Volume</div>
                    <div className="font-semibold">{pool.volume24h}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">24h Fees</div>
                    <div className="font-semibold">{pool.fees24h}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">APY</div>
                    <div className="font-semibold text-green-500 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {pool.apy}
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <Button onClick={() => onSelectPool(pool.id)}>
                  Add Liquidity
                </Button>
              </div>

              {/* Mobile Stats */}
              <div className="md:hidden grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
                <div>
                  <div className="text-xs text-muted-foreground">TVL</div>
                  <div className="font-semibold">{pool.tvl}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">APY</div>
                  <div className="font-semibold text-green-500">{pool.apy}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
