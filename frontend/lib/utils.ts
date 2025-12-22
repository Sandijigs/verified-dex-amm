import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`
}

export function formatAmount(amount: number | string, decimals = 6): string {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(value)) return '0'

  if (value < 0.000001) return '< 0.000001'
  if (value < 1) return value.toFixed(6)
  if (value < 1000) return value.toFixed(4)
  if (value < 1000000) return `${(value / 1000).toFixed(2)}K`
  return `${(value / 1000000).toFixed(2)}M`
}

export function calculatePriceImpact(
  amountIn: number,
  amountOut: number,
  reserveIn: number,
  reserveOut: number
): number {
  const exactQuote = (amountIn * reserveOut) / reserveIn
  const priceImpact = ((exactQuote - amountOut) / exactQuote) * 100
  return Math.abs(priceImpact)
}