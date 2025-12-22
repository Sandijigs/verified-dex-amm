'use client'

import { useEffect, useState } from 'react'
import { AppConfig, UserSession } from '@stacks/connect'
import { CURRENT_NETWORK } from '@/lib/stacks/network'

const appConfig = new AppConfig(['store_write', 'publish_data'])
const userSession = new UserSession({ appConfig })

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [balance, setBalance] = useState<string | null>(null)

  useEffect(() => {
    if (userSession.isUserSignedIn()) {
      const userData = userSession.loadUserData()
      const address = userData.profile.stxAddress.testnet
      setAddress(address)
      setIsConnected(true)
      fetchBalance(address)
    }
  }, [])

  const fetchBalance = async (address: string) => {
    try {
      const response = await fetch(
        `${CURRENT_NETWORK.coreApiUrl}/extended/v1/address/${address}/balances`
      )
      const data = await response.json()
      const stxBalance = parseInt(data.stx.balance) / 1000000
      setBalance(stxBalance.toFixed(2))
    } catch (error) {
      console.error('Error fetching balance:', error)
    }
  }

  const disconnect = () => {
    userSession.signUserOut()
    setAddress(null)
    setIsConnected(false)
    setBalance(null)
    window.location.reload()
  }

  return {
    address,
    isConnected,
    balance,
    disconnect,
    userSession,
  }
}