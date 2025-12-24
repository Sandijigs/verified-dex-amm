'use client'

import { Button } from '@/components/ui/button'
import { useSwap } from '@/hooks/useSwap'
import { useWalletConnect } from '@/providers/WalletConnectProvider'
import { CONTRACT_ADDRESSES } from '@/lib/contracts/addresses'

interface SwapButtonProps {
  tokenFrom: string
  tokenTo: string
  amountFrom: string
  amountTo: string
  slippage: number
}

export function SwapButton({
  tokenFrom,
  tokenTo,
  amountFrom,
  amountTo,
  slippage,
}: SwapButtonProps) {
  const { connected, connectWallet } = useWalletConnect()
  const { executeSwap, isLoading, error } = useSwap()

  const handleSwap = async () => {
    if (!connected) {
      await connectWallet()
      return
    }

    if (!amountFrom || !amountTo) {
      console.error('Invalid amounts - please enter valid amounts')
      return
    }

    try {
      // Get token contract addresses
      const tokenInContract = getTokenContract(tokenFrom)
      const tokenOutContract = getTokenContract(tokenTo)

      // Calculate minimum amount out with slippage
      const minAmountOut = (parseFloat(amountTo) * (1 - slippage / 100)).toFixed(6)

      await executeSwap(
        tokenInContract,
        tokenOutContract,
        amountFrom,
        minAmountOut,
        slippage
      )

      console.log(`Swap initiated: ${amountFrom} ${tokenFrom} for ${tokenTo}`)
    } catch (err) {
      console.error('Swap error:', err)
      console.error(error || 'Failed to execute swap')
    }
  }

  if (!connected) {
    return (
      <Button size="lg" className="w-full gap-2" onClick={handleSwap}>
        Connect Wallet to Swap
      </Button>
    )
  }

  if (!amountFrom || parseFloat(amountFrom) === 0) {
    return (
      <Button size="lg" className="w-full" disabled>
        Enter an amount
      </Button>
    )
  }

  return (
    <Button
      size="lg"
      className="w-full gap-2"
      onClick={handleSwap}
      disabled={isLoading}
    >
      {isLoading ? (
        <>Swapping...</>
      ) : (
        <>Swap {tokenFrom} for {tokenTo}</>
      )}
    </Button>
  )
}

// Helper function to get token contract address
function getTokenContract(token: string): string {
  const tokenMap: Record<string, string> = {
    'STX': 'STX',
    'TEST': CONTRACT_ADDRESSES.TEST_TOKEN,
    // Add more tokens as needed
  }

  return tokenMap[token] || CONTRACT_ADDRESSES.TEST_TOKEN
}