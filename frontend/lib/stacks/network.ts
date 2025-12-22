import { StacksTestnet, StacksMainnet } from '@stacks/network'

export const TESTNET = new StacksTestnet({
  url: 'https://api.testnet.hiro.so',
})

export const MAINNET = new StacksMainnet({
  url: 'https://api.mainnet.hiro.so',
})

export const CURRENT_NETWORK = TESTNET

export const EXPLORER_URL = 'https://explorer.hiro.so'

export function getTxUrl(txId: string, network: 'testnet' | 'mainnet' = 'testnet') {
  return `${EXPLORER_URL}/txid/${txId}?chain=${network}`
}

export function getContractUrl(
  contractAddress: string,
  network: 'testnet' | 'mainnet' = 'testnet'
) {
  return `${EXPLORER_URL}/txid/contract/${contractAddress}?chain=${network}`
}