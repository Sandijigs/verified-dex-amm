'use client'

import { useState } from 'react'
import { useWalletConnect } from '@/providers/WalletConnectProvider'
import { CONTRACT_ADDRESSES } from '@/lib/contracts/addresses'
import { uintCV, principalCV } from '@stacks/transactions'

export function useSwap() {
  const { callContract, connected } = useWalletConnect()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Execute a token swap through the router contract
   */
  const executeSwap = async (
    tokenIn: string,
    tokenOut: string,
    amountIn: string,
    minAmountOut: string,
    _slippage: number
  ) => {
    if (!connected) {
      setError('Please connect your wallet first')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Convert amounts to micro-units (1 token = 1,000,000 micro-units)
      const amountInMicro = Math.floor(parseFloat(amountIn) * 1_000_000)
      const minAmountOutMicro = Math.floor(parseFloat(minAmountOut) * 1_000_000)

      // Calculate deadline (current time + 10 minutes)
      const deadline = Math.floor(Date.now() / 1000) + 600

      // Build the contract call
      const functionArgs = [
        principalCV(tokenIn),
        principalCV(tokenOut),
        uintCV(amountInMicro),
        uintCV(minAmountOutMicro),
        uintCV(deadline),
      ]

      const [contractAddress, contractName] = CONTRACT_ADDRESSES.ROUTER.split('.')

      // Use the WalletConnect provider's callContract method
      const txId = await callContract({
        contractAddress,
        contractName,
        functionName: 'swap-tokens',
        functionArgs,
        postConditions: [],
        onFinish: (data: any) => {
          console.log('Swap transaction submitted:', data.txId)
          setIsLoading(false)
        },
        onCancel: () => {
          setError('Transaction cancelled')
          setIsLoading(false)
        },
      })

      console.log('Swap initiated with txId:', txId)
    } catch (err) {
      console.error('Swap error:', err)
      setError(err instanceof Error ? err.message : 'Failed to execute swap')
      setIsLoading(false)
    }
  }

  /**
   * Get quote for a swap (mock implementation)
   * In production, this would call the router to get actual quote
   */
  const getQuote = async (tokenIn: string, tokenOut: string, amountIn: string) => {
    try {
      // Mock quote - in production, call contract read-only function
      // For now, use simple 1:1 ratio
      const quote = {
        amountOut: amountIn,
        priceImpact: 0.1,
        fee: parseFloat(amountIn) * 0.003,
        route: [tokenIn, tokenOut],
      }
      return quote
    } catch (err) {
      console.error('Quote error:', err)
      return null
    }
  }

  return {
    executeSwap,
    getQuote,
    isLoading,
    error,
  }
}
