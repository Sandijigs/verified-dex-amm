// sBTC Pool Hook (AMM)
// Interact with ST1WPQWDNG2H8VMG93PW3JM74SGXVTA38ETGZ64F8.sbtc-pool-minimal

import { useState, useEffect } from 'react';
import { useWalletConnect } from './useWalletConnect';
import { CONTRACTS, getContractId, DECIMALS, fromMicroUnits, toMicroUnits } from '../lib/contracts';
import { cvToValue, uintCV } from '@stacks/transactions';

interface PoolReserves {
  stx: number;
  sbtc: number;
  lpSupply: number;
}

export const useSbtcPool = () => {
  const { connected, address, callContract, callReadOnly } = useWalletConnect();
  const [reserves, setReserves] = useState<PoolReserves>({ stx: 0, sbtc: 0, lpSupply: 0 });
  const [lpBalance, setLpBalance] = useState<number>(0);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const contractId = getContractId('SBTC_POOL');

  // Fetch pool reserves
  const fetchReserves = async () => {
    try {
      const result = await callReadOnly({
        contractAddress: CONTRACTS.SBTC_POOL.address,
        contractName: CONTRACTS.SBTC_POOL.name,
        functionName: 'get-reserves',
        functionArgs: [],
      });

      if (result) {
        const reservesData = cvToValue(result);
        setReserves({
          stx: fromMicroUnits(reservesData.stx.value, DECIMALS.STX),
          sbtc: fromMicroUnits(reservesData.sbtc.value, DECIMALS.SBTC),
          lpSupply: reservesData['lp-supply'].value,
        });
      }
    } catch (error) {
      console.error('Error fetching reserves:', error);
    }
  };

  // Fetch LP balance
  const fetchLpBalance = async (userAddress?: string) => {
    if (!userAddress && !address) return;

    try {
      const result = await callReadOnly({
        contractAddress: CONTRACTS.SBTC_POOL.address,
        contractName: CONTRACTS.SBTC_POOL.name,
        functionName: 'get-lp-balance',
        functionArgs: [principalCV(userAddress || address!)],
      });

      if (result) {
        setLpBalance(cvToValue(result));
      }
    } catch (error) {
      console.error('Error fetching LP balance:', error);
    }
  };

  // Check if pool is initialized
  const checkInitialized = async () => {
    try {
      const result = await callReadOnly({
        contractAddress: CONTRACTS.SBTC_POOL.address,
        contractName: CONTRACTS.SBTC_POOL.name,
        functionName: 'is-initialized',
        functionArgs: [],
      });

      if (result) {
        setIsInitialized(cvToValue(result));
      }
    } catch (error) {
      console.error('Error checking pool initialization:', error);
    }
  };

  // Initialize pool (owner only)
  const initialize = async () => {
    if (!connected) throw new Error('Wallet not connected');

    setLoading(true);
    try {
      const txId = await callContract({
        contractAddress: CONTRACTS.SBTC_POOL.address,
        contractName: CONTRACTS.SBTC_POOL.name,
        functionName: 'initialize',
        functionArgs: [],
        postConditions: [],
        onFinish: (data: any) => {
          console.log('Pool initialized:', data);
          checkInitialized();
        },
        onCancel: () => {
          console.log('Initialization cancelled');
        },
      });

      return txId;
    } catch (error) {
      console.error('Error initializing pool:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Add liquidity
  const addLiquidity = async (stxAmount: number, sbtcAmount: number, minLpTokens: number = 0) => {
    if (!connected) throw new Error('Wallet not connected');

    setLoading(true);
    try {
      const stxMicro = toMicroUnits(stxAmount, DECIMALS.STX);
      const sbtcMicro = toMicroUnits(sbtcAmount, DECIMALS.SBTC);

      const txId = await callContract({
        contractAddress: CONTRACTS.SBTC_POOL.address,
        contractName: CONTRACTS.SBTC_POOL.name,
        functionName: 'add-liquidity',
        functionArgs: [
          uintCV(stxMicro),
          uintCV(sbtcMicro),
          uintCV(minLpTokens),
        ],
        postConditions: [],
        onFinish: (data: any) => {
          console.log('Liquidity added:', data);
          fetchReserves();
          fetchLpBalance();
        },
        onCancel: () => {
          console.log('Add liquidity cancelled');
        },
      });

      return txId;
    } catch (error) {
      console.error('Error adding liquidity:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Remove liquidity
  const removeLiquidity = async (lpAmount: number, minStx: number = 0, minSbtc: number = 0) => {
    if (!connected) throw new Error('Wallet not connected');

    setLoading(true);
    try {
      const txId = await callContract({
        contractAddress: CONTRACTS.SBTC_POOL.address,
        contractName: CONTRACTS.SBTC_POOL.name,
        functionName: 'remove-liquidity',
        functionArgs: [
          uintCV(lpAmount),
          uintCV(toMicroUnits(minStx, DECIMALS.STX)),
          uintCV(toMicroUnits(minSbtc, DECIMALS.SBTC)),
        ],
        postConditions: [],
        onFinish: (data: any) => {
          console.log('Liquidity removed:', data);
          fetchReserves();
          fetchLpBalance();
        },
        onCancel: () => {
          console.log('Remove liquidity cancelled');
        },
      });

      return txId;
    } catch (error) {
      console.error('Error removing liquidity:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Swap STX for sBTC
  const swapStxForSbtc = async (stxAmount: number, minSbtcOut: number = 0) => {
    if (!connected) throw new Error('Wallet not connected');

    setLoading(true);
    try {
      const stxMicro = toMicroUnits(stxAmount, DECIMALS.STX);

      const txId = await callContract({
        contractAddress: CONTRACTS.SBTC_POOL.address,
        contractName: CONTRACTS.SBTC_POOL.name,
        functionName: 'swap-stx-for-sbtc',
        functionArgs: [
          uintCV(stxMicro),
          uintCV(toMicroUnits(minSbtcOut, DECIMALS.SBTC)),
        ],
        postConditions: [],
        onFinish: (data: any) => {
          console.log('Swap completed:', data);
          fetchReserves();
        },
        onCancel: () => {
          console.log('Swap cancelled');
        },
      });

      return txId;
    } catch (error) {
      console.error('Error swapping STX for sBTC:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Swap sBTC for STX
  const swapSbtcForStx = async (sbtcAmount: number, minStxOut: number = 0) => {
    if (!connected) throw new Error('Wallet not connected');

    setLoading(true);
    try {
      const sbtcMicro = toMicroUnits(sbtcAmount, DECIMALS.SBTC);

      const txId = await callContract({
        contractAddress: CONTRACTS.SBTC_POOL.address,
        contractName: CONTRACTS.SBTC_POOL.name,
        functionName: 'swap-sbtc-for-stx',
        functionArgs: [
          uintCV(sbtcMicro),
          uintCV(toMicroUnits(minStxOut, DECIMALS.STX)),
        ],
        postConditions: [],
        onFinish: (data: any) => {
          console.log('Swap completed:', data);
          fetchReserves();
        },
        onCancel: () => {
          console.log('Swap cancelled');
        },
      });

      return txId;
    } catch (error) {
      console.error('Error swapping sBTC for STX:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch when wallet connects
  useEffect(() => {
    fetchReserves();
    checkInitialized();

    if (connected && address) {
      fetchLpBalance();
    }
  }, [connected, address]);

  return {
    // State
    reserves,
    lpBalance,
    isInitialized,
    loading,
    contractId,

    // Functions
    initialize,
    addLiquidity,
    removeLiquidity,
    swapStxForSbtc,
    swapSbtcForStx,
    fetchReserves,
    fetchLpBalance,
    checkInitialized,
  };
};
