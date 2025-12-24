'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { AppConfig, UserSession, showConnect } from '@stacks/connect'
import { StacksTestnet, StacksMainnet } from '@stacks/network'
import {
  makeContractCall,
  AnchorMode,
  PostConditionMode,
  broadcastTransaction,
  TxBroadcastResult,
} from '@stacks/transactions'

// WalletConnect Project ID from Reown Dashboard
const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '973aec75d9c96397c8ccd94d62bada81'

const appConfig = new AppConfig(['store_write', 'publish_data'])
const userSession = new UserSession({ appConfig })

interface WalletContextType {
  // Connection state
  connected: boolean
  connecting: boolean
  address: string | null
  network: 'mainnet' | 'testnet'

  // Actions
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
  switchNetwork: (network: 'mainnet' | 'testnet') => void

  // Transaction methods
  callContract: (params: ContractCallParams) => Promise<string>
  getBalance: (address: string) => Promise<string>

  // Wallet session
  userSession: UserSession
}

interface ContractCallParams {
  contractAddress: string
  contractName: string
  functionName: string
  functionArgs: any[]
  postConditions?: any[]
  onFinish?: (data: any) => void
  onCancel?: () => void
}

const WalletContext = createContext<WalletContextType | null>(null)

export function WalletConnectProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [address, setAddress] = useState<string | null>(null)
  const [network, setNetwork] = useState<'mainnet' | 'testnet'>('testnet')

  // Initialize - check if user is already signed in
  useEffect(() => {
    if (userSession.isUserSignedIn()) {
      const userData = userSession.loadUserData()
      // Get address for current network
      const currentAddress = network === 'mainnet'
        ? userData.profile.stxAddress.mainnet
        : userData.profile.stxAddress.testnet
      setAddress(currentAddress)
      setConnected(true)
    }
  }, [network])

  // Connect wallet with WalletConnect support
  const connectWallet = useCallback(async () => {
    setConnecting(true)

    try {
      // Use @stacks/connect v8+ with WalletConnect
      showConnect({
        appDetails: {
          name: 'Verified DEX',
          icon: typeof window !== 'undefined' ? window.location.origin + '/logo.png' : '',
        },
        redirectTo: '/',
        onFinish: () => {
          if (userSession.isUserSignedIn()) {
            const userData = userSession.loadUserData()
            const currentAddress = network === 'mainnet'
              ? userData.profile.stxAddress.mainnet
              : userData.profile.stxAddress.testnet
            setAddress(currentAddress)
            setConnected(true)
            console.log('✅ Wallet connected:', currentAddress)
          }
          setConnecting(false)
        },
        onCancel: () => {
          console.log('❌ Wallet connection cancelled')
          setConnecting(false)
        },
        userSession,
      })
    } catch (error) {
      console.error('Connection error:', error)
      setConnecting(false)
    }
  }, [network])

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    userSession.signUserOut()
    setConnected(false)
    setAddress(null)
    console.log('🔌 Wallet disconnected')
  }, [])

  // Switch network
  const switchNetwork = useCallback((newNetwork: 'mainnet' | 'testnet') => {
    setNetwork(newNetwork)

    // Update address if connected
    if (userSession.isUserSignedIn()) {
      const userData = userSession.loadUserData()
      const newAddress = newNetwork === 'mainnet'
        ? userData.profile.stxAddress.mainnet
        : userData.profile.stxAddress.testnet
      setAddress(newAddress)
      console.log(`🔄 Switched to ${newNetwork}:`, newAddress)
    }
  }, [])

  // Call contract function
  const callContract = useCallback(async (params: ContractCallParams): Promise<string> => {
    if (!connected || !address) {
      throw new Error('Wallet not connected')
    }

    return new Promise((resolve, reject) => {
      const networkObj = network === 'mainnet' ? new StacksMainnet() : new StacksTestnet()

      console.log('📤 Contract call:', {
        contract: `${params.contractAddress}.${params.contractName}`,
        function: params.functionName,
        network: network,
      })

      // Use openContractCall from @stacks/connect for contract transactions
      import('@stacks/connect').then(({ openContractCall }) => {
        openContractCall({
          contractAddress: params.contractAddress,
          contractName: params.contractName,
          functionName: params.functionName,
          functionArgs: params.functionArgs,
          network: networkObj,
          anchorMode: AnchorMode.Any,
          postConditionMode: params.postConditions && params.postConditions.length > 0
            ? PostConditionMode.Deny
            : PostConditionMode.Allow,
          postConditions: params.postConditions || [],
          onFinish: (data: any) => {
            console.log('✅ Transaction broadcast:', data.txId)
            params.onFinish?.(data)
            resolve(data.txId)
          },
          onCancel: () => {
            console.log('❌ Transaction cancelled')
            params.onCancel?.()
            reject(new Error('Transaction cancelled by user'))
          },
        })
      }).catch(reject)
    })
  }, [connected, address, network])

  // Get STX balance
  const getBalance = useCallback(async (walletAddress: string): Promise<string> => {
    const networkObj = network === 'mainnet' ? new StacksMainnet() : new StacksTestnet()

    try {
      const response = await fetch(
        `${networkObj.coreApiUrl}/extended/v1/address/${walletAddress}/balances`
      )
      const data = await response.json()
      const stxBalance = BigInt(data.stx.balance) / BigInt(1_000_000)
      return stxBalance.toString()
    } catch (error) {
      console.error('Error fetching balance:', error)
      return '0'
    }
  }, [network])

  return (
    <WalletContext.Provider
      value={{
        connected,
        connecting,
        address,
        network,
        connectWallet,
        disconnectWallet,
        switchNetwork,
        callContract,
        getBalance,
        userSession,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export function useWalletConnect() {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error('useWalletConnect must be used within WalletConnectProvider')
  }
  return context
}
