// VDEX Token Hook
// Interact with ST1WPQWDNG2H8VMG93PW3JM74SGXVTA38ETGZ64F8.vdex-token

import { useState, useEffect } from 'react';
import { useWalletConnect } from './useWalletConnect';
import { CONTRACTS, getContractId, DECIMALS, fromMicroUnits, toMicroUnits } from '../lib/contracts';
import { cvToValue, uintCV, principalCV, noneCV } from '@stacks/transactions';

export const useVdexToken = () => {
  const { connected, address, callContract, callReadOnly } = useWalletConnect();
  const [balance, setBalance] = useState<number>(0);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const contractId = getContractId('VDEX_TOKEN');

  // Get VDEX balance
  const fetchBalance = async (userAddress?: string) => {
    if (!userAddress && !address) return;

    try {
      const result = await callReadOnly({
        contractAddress: CONTRACTS.VDEX_TOKEN.address,
        contractName: CONTRACTS.VDEX_TOKEN.name,
        functionName: 'get-balance',
        functionArgs: [principalCV(userAddress || address!)],
      });

      if (result) {
        const balanceValue = cvToValue(result);
        setBalance(fromMicroUnits(balanceValue.value, DECIMALS.VDEX));
      }
    } catch (error) {
      console.error('Error fetching VDEX balance:', error);
    }
  };

  // Check if token is initialized
  const checkInitialized = async () => {
    try {
      const result = await callReadOnly({
        contractAddress: CONTRACTS.VDEX_TOKEN.address,
        contractName: CONTRACTS.VDEX_TOKEN.name,
        functionName: 'is-initialized-check',
        functionArgs: [],
      });

      if (result) {
        setIsInitialized(cvToValue(result));
      }
    } catch (error) {
      console.error('Error checking initialization:', error);
    }
  };

  // Initialize VDEX token (owner only)
  const initialize = async (treasuryAddress: string) => {
    if (!connected) throw new Error('Wallet not connected');

    setLoading(true);
    try {
      const txId = await callContract({
        contractAddress: CONTRACTS.VDEX_TOKEN.address,
        contractName: CONTRACTS.VDEX_TOKEN.name,
        functionName: 'initialize',
        functionArgs: [principalCV(treasuryAddress)],
        postConditions: [],
        onFinish: (data: any) => {
          console.log('VDEX initialized:', data);
          checkInitialized();
          fetchBalance();
        },
        onCancel: () => {
          console.log('Initialization cancelled');
        },
      });

      return txId;
    } catch (error) {
      console.error('Error initializing VDEX:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Transfer VDEX tokens
  const transfer = async (amount: number, recipient: string) => {
    if (!connected || !address) throw new Error('Wallet not connected');

    setLoading(true);
    try {
      const amountMicro = toMicroUnits(amount, DECIMALS.VDEX);

      const txId = await callContract({
        contractAddress: CONTRACTS.VDEX_TOKEN.address,
        contractName: CONTRACTS.VDEX_TOKEN.name,
        functionName: 'transfer',
        functionArgs: [
          uintCV(amountMicro),
          principalCV(address),
          principalCV(recipient),
          noneCV(),
        ],
        postConditions: [],
        onFinish: (data: any) => {
          console.log('Transfer successful:', data);
          fetchBalance();
        },
        onCancel: () => {
          console.log('Transfer cancelled');
        },
      });

      return txId;
    } catch (error) {
      console.error('Error transferring VDEX:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Authorize minter (owner only)
  const authorizeMinter = async (minterAddress: string, authorized: boolean) => {
    if (!connected) throw new Error('Wallet not connected');

    setLoading(true);
    try {
      const txId = await callContract({
        contractAddress: CONTRACTS.VDEX_TOKEN.address,
        contractName: CONTRACTS.VDEX_TOKEN.name,
        functionName: 'authorize-minter',
        functionArgs: [
          principalCV(minterAddress),
          authorized ? uintCV(1) : uintCV(0), // true/false as uint
        ],
        postConditions: [],
        onFinish: (data: any) => {
          console.log('Minter authorization updated:', data);
        },
        onCancel: () => {
          console.log('Authorization cancelled');
        },
      });

      return txId;
    } catch (error) {
      console.error('Error authorizing minter:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch balance when wallet connects
  useEffect(() => {
    if (connected && address) {
      fetchBalance();
      checkInitialized();
    }
  }, [connected, address]);

  return {
    // State
    balance,
    isInitialized,
    loading,
    contractId,

    // Functions
    initialize,
    transfer,
    authorizeMinter,
    fetchBalance,
    checkInitialized,
  };
};
