'use client'

import { useWalletConnect } from '@/providers/WalletConnectProvider'
import { Button } from '@/components/ui/button'
import {
  Wallet,
  LogOut,
  Network,
  ChevronDown,
  Loader2
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useState, useEffect } from 'react'

export function WalletConnectButton() {
  const {
    connected,
    connecting,
    address,
    network,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    getBalance,
  } = useWalletConnect()

  const [balance, setBalance] = useState<string | null>(null)
  const [loadingBalance, setLoadingBalance] = useState(false)

  // Fetch balance when connected
  useEffect(() => {
    if (connected && address) {
      setLoadingBalance(true)
      getBalance(address)
        .then(setBalance)
        .finally(() => setLoadingBalance(false))
    } else {
      setBalance(null)
    }
  }, [connected, address, network, getBalance])

  // Format address for display
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  // Connecting state
  if (connecting) {
    return (
      <Button disabled className="gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Connecting...
      </Button>
    )
  }

  // Connected state
  if (connected && address) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2 min-w-[200px] justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium">{formatAddress(address)}</span>
                {loadingBalance ? (
                  <span className="text-xs text-muted-foreground">Loading...</span>
                ) : balance ? (
                  <span className="text-xs text-muted-foreground">{balance} STX</span>
                ) : null}
              </div>
            </div>
            <ChevronDown className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-[250px]">
          <DropdownMenuLabel>
            <div className="flex flex-col gap-1">
              <span>My Wallet</span>
              <span className="text-xs font-normal text-muted-foreground font-mono">
                {address}
              </span>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          {/* Network Switcher */}
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Network
          </DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => switchNetwork('testnet')}
            className="gap-2"
          >
            <Network className="w-4 h-4" />
            <span>Testnet</span>
            {network === 'testnet' && (
              <span className="ml-auto w-2 h-2 bg-green-500 rounded-full" />
            )}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => switchNetwork('mainnet')}
            className="gap-2"
          >
            <Network className="w-4 h-4" />
            <span>Mainnet</span>
            {network === 'mainnet' && (
              <span className="ml-auto w-2 h-2 bg-green-500 rounded-full" />
            )}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Balance */}
          {balance && (
            <>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Balance
              </DropdownMenuLabel>
              <DropdownMenuItem disabled>
                <span className="font-mono">{balance} STX</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />
            </>
          )}

          {/* Disconnect */}
          <DropdownMenuItem
            onClick={disconnectWallet}
            className="gap-2 text-red-600 focus:text-red-600"
          >
            <LogOut className="w-4 h-4" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // Not connected - show connect button
  return (
    <Button onClick={connectWallet} className="gap-2">
      <Wallet className="w-4 h-4" />
      Connect Wallet
    </Button>
  )
}
