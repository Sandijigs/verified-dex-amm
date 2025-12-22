'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, TrendingUp } from 'lucide-react'
import { PoolList } from '@/components/pools/PoolList'
import { AddLiquidityModal } from '@/components/pools/AddLiquidityModal'

export default function PoolsPage() {
  const [showAddLiquidity, setShowAddLiquidity] = useState(false)
  const [selectedPool, setSelectedPool] = useState<string | null>(null)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Liquidity Pools</h1>
            <p className="text-muted-foreground">
              Provide liquidity and earn 0.3% fees on all swaps
            </p>
          </div>
          <Button onClick={() => setShowAddLiquidity(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Liquidity
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Value Locked
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$0.00</div>
              <p className="text-xs text-muted-foreground mt-1">Across all pools</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                24h Volume
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$0.00</div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="text-green-500">+0%</span> vs yesterday
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                24h Fees
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$0.00</div>
              <p className="text-xs text-muted-foreground mt-1">Earned by LPs</p>
            </CardContent>
          </Card>
        </div>

        {/* Your Liquidity Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Your Liquidity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="mb-4">You don't have any liquidity positions yet</p>
              <Button onClick={() => setShowAddLiquidity(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Liquidity
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* All Pools */}
        <Card>
          <CardHeader>
            <CardTitle>All Pools</CardTitle>
          </CardHeader>
          <CardContent>
            <PoolList onSelectPool={setSelectedPool} />
          </CardContent>
        </Card>

        {/* Add Liquidity Modal */}
        {showAddLiquidity && (
          <AddLiquidityModal
            poolId={selectedPool}
            onClose={() => {
              setShowAddLiquidity(false)
              setSelectedPool(null)
            }}
          />
        )}
      </div>
    </div>
  )
}
