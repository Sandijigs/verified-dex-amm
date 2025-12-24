'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Activity, Users, Droplets, DollarSign } from 'lucide-react'

export default function AnalyticsPage() {
  // Mock data - will be replaced with real data from Chainhooks
  const stats = {
    totalValueLocked: '$0.00',
    tvlChange: '+0.00%',
    totalVolume: '$0.00',
    volumeChange: '+0.00%',
    totalFees: '$0.00',
    feesChange: '+0.00%',
    totalUsers: '0',
    usersChange: '+0',
    totalTransactions: '0',
    transactionsChange: '+0',
    totalPools: '0',
    poolsChange: '+0',
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Analytics</h1>
          <p className="text-muted-foreground">
            Real-time metrics powered by Hiro Chainhooks
          </p>
        </div>

        {/* Main Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* TVL */}
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Droplets className="w-4 h-4" />
                Total Value Locked
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-2">{stats.totalValueLocked}</div>
              <div className="flex items-center gap-1 text-sm">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-green-500">{stats.tvlChange}</span>
                <span className="text-muted-foreground">vs last 24h</span>
              </div>
            </CardContent>
          </Card>

          {/* Volume */}
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                24h Trading Volume
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-2">{stats.totalVolume}</div>
              <div className="flex items-center gap-1 text-sm">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-green-500">{stats.volumeChange}</span>
                <span className="text-muted-foreground">vs yesterday</span>
              </div>
            </CardContent>
          </Card>

          {/* Fees */}
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                24h Fees Generated
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-2">{stats.totalFees}</div>
              <div className="flex items-center gap-1 text-sm">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-green-500">{stats.feesChange}</span>
                <span className="text-muted-foreground">vs yesterday</span>
              </div>
            </CardContent>
          </Card>

          {/* Users */}
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Total Users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-2">{stats.totalUsers}</div>
              <div className="flex items-center gap-1 text-sm">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-green-500">{stats.usersChange}</span>
                <span className="text-muted-foreground">new today</span>
              </div>
            </CardContent>
          </Card>

          {/* Transactions */}
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Total Transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-2">{stats.totalTransactions}</div>
              <div className="flex items-center gap-1 text-sm">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-green-500">{stats.transactionsChange}</span>
                <span className="text-muted-foreground">today</span>
              </div>
            </CardContent>
          </Card>

          {/* Pools */}
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Droplets className="w-4 h-4" />
                Active Pools
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-2">{stats.totalPools}</div>
              <div className="flex items-center gap-1 text-sm">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-green-500">{stats.poolsChange}</span>
                <span className="text-muted-foreground">new pools</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chainhooks Status */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Chainhooks Monitoring</CardTitle>
            <CardDescription>
              Real-time event tracking powered by Hiro Chainhooks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <div>
                    <div className="font-medium">Pool Events Hook</div>
                    <div className="text-sm text-muted-foreground">
                      Monitoring liquidity operations
                    </div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">Active</div>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <div>
                    <div className="font-medium">Swap Events Hook</div>
                    <div className="text-sm text-muted-foreground">
                      Tracking token swaps and volume
                    </div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">Active</div>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <div>
                    <div className="font-medium">TWAP Oracle Hook</div>
                    <div className="text-sm text-muted-foreground">
                      Recording price observations
                    </div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">Active</div>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <div>
                    <div className="font-medium">Factory Events Hook</div>
                    <div className="text-sm text-muted-foreground">
                      Tracking pool creation
                    </div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">Active</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Builder Challenge Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Builder Challenge Metrics</CardTitle>
            <CardDescription>
              Key metrics for Talent Protocol Builder Challenge
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-4">✅ Implemented Features</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <TrendingUp className="w-4 h-4 text-green-500 mt-0.5" />
                    <span>Hiro Chainhooks integration for event monitoring</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <TrendingUp className="w-4 h-4 text-green-500 mt-0.5" />
                    <span>User tracking from transaction senders</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <TrendingUp className="w-4 h-4 text-green-500 mt-0.5" />
                    <span>Fees tracking from swap operations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <TrendingUp className="w-4 h-4 text-green-500 mt-0.5" />
                    <span>Clarity 4 features (contract-hash?, stacks-block-time)</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-4">📊 Live Metrics</h3>
                <div className="space-y-3">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Total Users Generated</div>
                    <div className="text-2xl font-bold">{stats.totalUsers}</div>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Total Fees Generated</div>
                    <div className="text-2xl font-bold">{stats.totalFees}</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
