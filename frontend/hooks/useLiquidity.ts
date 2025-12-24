'use client'

import { useState } from 'react'
import { useWallet } from './useWallet'
import { CONTRACT_ADDRESSES } from '@/lib/contracts/addresses'
import { CURRENT_NETWORK } from '@/lib/stacks/network'
import {
  makeContractCall,
  AnchorMode,
  PostConditionMode,
  uintCV,
  principalCV,
} from '@stacks/transactions'
import { openContractCall } from '@stacks/connect'

export function useLiquidity() {
  const { userSession, address } = useWallet()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Add liquidity to a pool
   */
  const addLiquidity = async (
    poolAddress: string,
    tokenA: string,
    tokenB: string,
    amountA: string,
    amountB: string,
    minLiquidity: string
  ) => {
    if (!userSession.isUserSignedIn()) {
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
        principalCV(poolAddress),
        uintCV(amountAMicro),
        uintCV(amountBMicro),
        uintCV(minLiquidityMicro),
      ]

      // In production, call the pool contract's add-liquidity function
      const [contractAddress, contractName] = poolAddress.split('.')

      const txOptions = {
        network: CURRENT_NETWORK,
        anchorMode: AnchorMode.Any,
        contractAddress,
        contractName,
        functionName: 'add-liquidity',
        functionArgs,
        postConditionMode: PostConditionMode.Deny,
        onFinish: (data: any) => {
          console.log('Add liquidity transaction submitted:', data.txId)
          setIsLoading(false)
        },
        onCancel: () => {
          setError('Transaction cancelled')
          setIsLoading(false)
        },
      }

      await openContractCall(txOptions)
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
    if (!userSession.isUserSignedIn()) {
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

      const txOptions = {
        network: CURRENT_NETWORK,
        anchorMode: AnchorMode.Any,
        contractAddress,
        contractName,
        functionName: 'remove-liquidity',
        functionArgs,
        postConditionMode: PostConditionMode.Deny,
        onFinish: (data: any) => {
          console.log('Remove liquidity transaction submitted:', data.txId)
          setIsLoading(false)
        },
        onCancel: () => {
          setError('Transaction cancelled')
          setIsLoading(false)
        },
      }

      await openContractCall(txOptions)
    } catch (err) {
      console.error('Remove liquidity error:', err)
      setError(err instanceof Error ? err.message : 'Failed to remove liquidity')
      setIsLoading(false)
    }
  }

  /**
   * Get user's liquidity position in a pool
   */
  const getLiquidityPosition = async (poolAddress: string, userAddress: string) => {
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
