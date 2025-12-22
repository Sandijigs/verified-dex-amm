'use client'

import Link from 'next/link'
import { Shield, Zap, Lock, TrendingUp, ArrowRight, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function HomePage() {
  return (
    <div className="container mx-auto px-4">
      {/* Hero Section */}
      <section className="py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6">
            <Shield className="w-4 h-4" />
            <span className="text-sm font-medium">Built with Clarity 4 on Stacks</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Trade with Confidence on Verified Pools
          </h1>

          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            The most secure decentralized exchange on Stacks. Every pool is verified using Clarity 4's contract-hash feature to prevent rug pulls.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/swap">
              <Button size="lg" className="w-full sm:w-auto">
                Start Trading
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href="/pools">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Explore Pools
              </Button>
            </Link>
          </div>

          {/* Live Status */}
          <div className="mt-12 inline-flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>Live on Stacks Testnet</span>
            <span className="mx-2">•</span>
            <span className="font-mono">ST12KRGRZ...TAAXNM1ZV</span>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose Verified DEX?</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Advanced security features powered by Clarity 4 smart contracts
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card>
            <CardHeader>
              <Shield className="w-12 h-12 text-primary mb-4" />
              <CardTitle>Verified Pools</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                All pools match verified templates using Clarity 4's contract-hash feature
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Lock className="w-12 h-12 text-primary mb-4" />
              <CardTitle>Rug Pull Prevention</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Template verification ensures pool code cannot be malicious
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <TrendingUp className="w-12 h-12 text-primary mb-4" />
              <CardTitle>TWAP Oracle</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Time-weighted pricing using stacks-block-time for accurate rates
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Zap className="w-12 h-12 text-primary mb-4" />
              <CardTitle>Low Fees</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Only 0.3% swap fee, with no hidden costs or frontrunning
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Clarity 4 Features Section */}
      <section className="py-20 bg-muted/50 -mx-4 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Powered by Clarity 4</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Leveraging the latest Clarity 4 features for enhanced security and functionality
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  contract-hash? Verification
                </CardTitle>
                <CardDescription>Pool Registry Security</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Every pool template is verified by computing its hash. Only pools matching verified templates can accept liquidity.
                </p>
                <code className="text-xs bg-background p-3 rounded block overflow-x-auto">
                  {`(map-set verified-templates
  (contract-hash? pool-template)
  true)`}
                </code>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  stacks-block-time
                </CardTitle>
                <CardDescription>TWAP Oracle & Router</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Time-weighted average price calculations and deadline protection using precise blockchain timestamps.
                </p>
                <code className="text-xs bg-background p-3 rounded block overflow-x-auto">
                  {`(let ((current-time stacks-block-time))
  (record-observation pool current-time price))`}
                </code>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Live Protocol Stats</h2>
          <p className="text-muted-foreground">
            Real-time metrics powered by Hiro Chainhooks
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardDescription>Total Value Locked</CardDescription>
              <CardTitle className="text-3xl">$0.00</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>24h Trading Volume</CardDescription>
              <CardTitle className="text-3xl">$0.00</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Total Pools</CardDescription>
              <CardTitle className="text-3xl">0</CardTitle>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 text-center">
        <div className="max-w-3xl mx-auto bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl p-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Start Trading?</h2>
          <p className="text-muted-foreground mb-8">
            Connect your wallet and experience the most secure DEX on Stacks
          </p>
          <Link href="/swap">
            <Button size="lg">
              Launch App
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}
