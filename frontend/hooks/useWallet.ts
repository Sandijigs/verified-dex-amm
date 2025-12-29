'use client'

import { useEffect, useState } from 'react'
import { CURRENT_NETWORK } from '@/lib/stacks/network'

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [balance, setBalance] = useState<string | null>(null)
  const [userSession, setUserSession] = useState<any>(null)

  useEffect(() => {
    // Dynamic import to avoid SSR issues
    import('@stacks/connect').then(({ AppConfig, UserSession }) => {
      const appConfig = new AppConfig(['store_write', 'publish_data'])
      const session = new UserSession({ appConfig })
      setUserSession(session)

      // Check if user is already authenticated
      if (session.isUserSignedIn()) {
        const userData = session.loadUserData()
        console.log('User data loaded:', userData)

        // Get the correct address based on network
        const userAddress = userData.profile.stxAddress.testnet || userData.profile.stxAddress.mainnet

        if (userAddress) {
          setAddress(userAddress)
          setIsConnected(true)
          fetchBalance(userAddress)
        }
      } else if (session.isSignInPending()) {
        // Handle pending sign in
        session.handlePendingSignIn().then((userData) => {
          console.log('Sign in completed:', userData)
          const userAddress = userData.profile.stxAddress.testnet || userData.profile.stxAddress.mainnet

          if (userAddress) {
            setAddress(userAddress)
            setIsConnected(true)
            fetchBalance(userAddress)
          }
        }).catch((error) => {
          console.error('Error handling pending sign in:', error)
        })
      }
    })
  }, [])

  const fetchBalance = async (address: string) => {
    if (!address) {
      console.error('No address provided to fetchBalance')
      return
    }

    try {
      const response = await fetch(
        `${CURRENT_NETWORK.coreApiUrl}/extended/v1/address/${address}/balances`
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.stx && data.stx.balance) {
        const stxBalance = parseInt(data.stx.balance) / 1000000
        setBalance(stxBalance.toFixed(2))
      }
    } catch (error) {
      console.error('Error fetching balance:', error)
    }
  }

  const disconnect = () => {
    if (userSession) {
      userSession.signUserOut()
    }
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