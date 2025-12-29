'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Wallet, LogOut } from 'lucide-react'
import { useWallet } from '@/hooks/useWallet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function ConnectButton() {
  const { address, isConnected, disconnect, balance, userSession } = useWallet()
  const [isConnecting, setIsConnecting] = useState(false)

  const handleConnect = () => {
    setIsConnecting(true)

    if (typeof window !== 'undefined') {
      import('@stacks/connect').then((mod) => {
        // Use authenticate which is the recommended method for @stacks/connect v8+
        const { authenticate } = mod

        authenticate({
          appDetails: {
            name: 'Verified DEX',
            icon: window.location.origin + '/logo.svg',
          },
          redirectTo: '/',
          onFinish: (payload) => {
            console.log('Authentication successful:', payload)
            setIsConnecting(false)
            window.location.reload()
          },
          onCancel: () => {
            console.log('Authentication cancelled')
            setIsConnecting(false)
          },
          userSession: userSession,
        })
      }).catch((error) => {
        console.error('Connection error:', error)
        setIsConnecting(false)
      })
    }
  }

  if (isConnected && address) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Wallet className="w-4 h-4" />
            <span className="hidden sm:inline">
              {address.slice(0, 6)}...{address.slice(-4)}
            </span>
            <span className="sm:hidden">
              {address.slice(0, 4)}...
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>
            <div className="flex flex-col gap-1">
              <span className="text-sm">Balance</span>
              <span className="text-xs text-muted-foreground">
                {balance ? `${balance} STX` : 'Loading...'}
              </span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <div className="flex flex-col gap-1">
              <span className="text-sm">Network</span>
              <span className="text-xs text-muted-foreground">Testnet</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={disconnect} className="text-red-600">
            <LogOut className="w-4 h-4 mr-2" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <Button
      onClick={handleConnect}
      disabled={isConnecting}
      className="gap-2"
    >
      <Wallet className="w-4 h-4" />
      {isConnecting ? 'Connecting...' : 'Connect Wallet'}
    </Button>
  )
}