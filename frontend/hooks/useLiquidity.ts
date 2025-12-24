'use client'

import { useState } from 'react'
import { useWalletConnect } from '@/providers/WalletConnectProvider'
import { uintCV } from '@stacks/transactions'

export function useLiquidity() {
  const { callContract, connected } = useWalletConnect()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Add liquidity to a pool
   */
  const addLiquidity = async (
    poolAddress: string,
    _tokenA: string,
    _tokenB: string,
    amountA: string,
    amountB: string,
    minLiquidity: string
  ) => {
    if (!connected) {
      setError('Please connect your wallet first')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Convert amounts to micro-units
      const amountAMicro = Math.floor(parseFloat(amountA) * 1_000_000)
      const amountBMicro = Math.floor(parseFloat(amountB) * 1_000_000)
      const minLiquidityMicro = Math.floor(parseFloat(minLiquidity) * 1_000_000)

      const functionArgs = [
        uintCV(amountAMicro),
        uintCV(amountBMicro),
        uintCV(minLiquidityMicro),
      ]

      // In production, call the pool contract's add-liquidity function
      const [contractAddress, contractName] = poolAddress.split('.')

      // Use the WalletConnect provider's callContract method
      const txId = await callContract({
        contractAddress,
        contractName,
        functionName: 'add-liquidity',
        functionArgs,
        postConditions: [],
        onFinish: (data: any) => {
          console.log('Add liquidity transaction submitted:', data.txId)
          setIsLoading(false)
        },
        onCancel: () => {
          setError('Transaction cancelled')
          setIsLoading(false)
        },
      })

      console.log('Add liquidity initiated with txId:', txId)
    } catch (err) {
      console.error('Add liquidity error:', err)
      setError(err instanceof Error ? err.message : 'Failed to add liquidity')
      setIsLoading(false)
    }
  }

  /**
   * Remove liquidity from a pool
   */
  const removeLiquidity = async (
    poolAddress: string,
    liquidity: string,
    minAmountA: string,
    minAmountB: string
  ) => {
    if (!connected) {
      setError('Please connect your wallet first')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Convert amounts to micro-units
      const liquidityMicro = Math.floor(parseFloat(liquidity) * 1_000_000)
      const minAmountAMicro = Math.floor(parseFloat(minAmountA) * 1_000_000)
      const minAmountBMicro = Math.floor(parseFloat(minAmountB) * 1_000_000)

      const functionArgs = [
        uintCV(liquidityMicro),
        uintCV(minAmountAMicro),
        uintCV(minAmountBMicro),
      ]

      const [contractAddress, contractName] = poolAddress.split('.')

      // Use the WalletConnect provider's callContract method
      const txId = await callContract({
        contractAddress,
        contractName,
        functionName: 'remove-liquidity',
        functionArgs,
        postConditions: [],
        onFinish: (data: any) => {
          console.log('Remove liquidity transaction submitted:', data.txId)
          setIsLoading(false)
        },
        onCancel: () => {
          setError('Transaction cancelled')
          setIsLoading(false)
        },
      })

      console.log('Remove liquidity initiated with txId:', txId)
    } catch (err) {
      console.error('Remove liquidity error:', err)
      setError(err instanceof Error ? err.message : 'Failed to remove liquidity')
      setIsLoading(false)
    }
  }

  /**
   * Get user's liquidity position in a pool
   */
  const getLiquidityPosition = async (_poolAddress: string, _userAddress: string) => {
    try {
      // In production, query the pool contract for user's LP token balance
      return {
        lpTokens: '0',
        shareOfPool: '0',
        tokenA: '0',
        tokenB: '0',
      }
    } catch (err) {
      console.error('Error getting liquidity position:', err)
      return null
    }
  }

  return {
    addLiquidity,
    removeLiquidity,
    getLiquidityPosition,
    isLoading,
    error,
  }
}
