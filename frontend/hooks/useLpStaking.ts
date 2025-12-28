// LP Staking Hook
// Interact with ST1WPQWDNG2H8VMG93PW3JM74SGXVTA38ETGZ64F8.lp-staking-final

import { useState, useEffect } from 'react';
import { useWalletConnect } from './useWalletConnect';
import { CONTRACTS, getContractId, DECIMALS, fromMicroUnits, REWARD_PER_BLOCK } from '../lib/contracts';
import { cvToValue, uintCV, principalCV } from '@stacks/transactions';

interface StakeInfo {
  amount: number;
  rewardCheckpoint: number;
}

export const useLpStaking = () => {
  const { connected, address, callContract, callReadOnly } = useWalletConnect();
  const [stakeInfo, setStakeInfo] = useState<StakeInfo | null>(null);
  const [pendingRewards, setPendingRewards] = useState<number>(0);
  const [totalStaked, setTotalStaked] = useState<number>(0);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const contractId = getContractId('LP_STAKING');

  // Fetch user stake info
  const fetchStakeInfo = async (userAddress?: string) => {
    if (!userAddress && !address) return;

    try {
      const result = await callReadOnly({
        contractAddress: CONTRACTS.LP_STAKING.address,
        contractName: CONTRACTS.LP_STAKING.name,
        functionName: 'get-stake',
        functionArgs: [principalCV(userAddress || address!)],
      });

      if (result) {
        const stakeData = cvToValue(result);
        if (stakeData) {
          setStakeInfo({
            amount: stakeData.amount.value,
            rewardCheckpoint: stakeData['reward-checkpoint'].value,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching stake info:', error);
    }
  };

  // Fetch pending rewards
  const fetchPendingRewards = async (userAddress?: string) => {
    if (!userAddress && !address) return;

    try {
      const result = await callReadOnly({
        contractAddress: CONTRACTS.LP_STAKING.address,
        contractName: CONTRACTS.LP_STAKING.name,
        functionName: 'get-pending-rewards',
        functionArgs: [principalCV(userAddress || address!)],
      });

      if (result) {
        const rewardsValue = cvToValue(result);
        setPendingRewards(fromMicroUnits(rewardsValue.value, DECIMALS.VDEX));
      }
    } catch (error) {
      console.error('Error fetching pending rewards:', error);
    }
  };

  // Fetch total staked
  const fetchTotalStaked = async () => {
    try {
      const result = await callReadOnly({
        contractAddress: CONTRACTS.LP_STAKING.address,
        contractName: CONTRACTS.LP_STAKING.name,
        functionName: 'get-total-staked',
        functionArgs: [],
      });

      if (result) {
        const totalValue = cvToValue(result);
        setTotalStaked(totalValue.value);
      }
    } catch (error) {
      console.error('Error fetching total staked:', error);
    }
  };

  // Check if staking is initialized
  const checkInitialized = async () => {
    try {
      const result = await callReadOnly({
        contractAddress: CONTRACTS.LP_STAKING.address,
        contractName: CONTRACTS.LP_STAKING.name,
        functionName: 'is-initialized',
        functionArgs: [],
      });

      if (result) {
        setIsInitialized(cvToValue(result));
      }
    } catch (error) {
      console.error('Error checking staking initialization:', error);
    }
  };

  // Initialize staking (owner only)
  const initialize = async () => {
    if (!connected) throw new Error('Wallet not connected');

    setLoading(true);
    try {
      const txId = await callContract({
        contractAddress: CONTRACTS.LP_STAKING.address,
        contractName: CONTRACTS.LP_STAKING.name,
        functionName: 'initialize',
        functionArgs: [],
        postConditions: [],
        onFinish: (data: any) => {
          console.log('Staking initialized:', data);
          checkInitialized();
        },
        onCancel: () => {
          console.log('Initialization cancelled');
        },
      });

      return txId;
    } catch (error) {
      console.error('Error initializing staking:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Register stake
  const registerStake = async (amount: number) => {
    if (!connected) throw new Error('Wallet not connected');

    setLoading(true);
    try {
      const txId = await callContract({
        contractAddress: CONTRACTS.LP_STAKING.address,
        contractName: CONTRACTS.LP_STAKING.name,
        functionName: 'register-stake',
        functionArgs: [uintCV(amount)],
        postConditions: [],
        onFinish: (data: any) => {
          console.log('Stake registered:', data);
          fetchStakeInfo();
          fetchTotalStaked();
          fetchPendingRewards();
        },
        onCancel: () => {
          console.log('Stake registration cancelled');
        },
      });

      return txId;
    } catch (error) {
      console.error('Error registering stake:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Unregister stake
  const unregisterStake = async (amount: number) => {
    if (!connected) throw new Error('Wallet not connected');

    setLoading(true);
    try {
      const txId = await callContract({
        contractAddress: CONTRACTS.LP_STAKING.address,
        contractName: CONTRACTS.LP_STAKING.name,
        functionName: 'unregister-stake',
        functionArgs: [uintCV(amount)],
        postConditions: [],
        onFinish: (data: any) => {
          console.log('Stake unregistered:', data);
          fetchStakeInfo();
          fetchTotalStaked();
          fetchPendingRewards();
        },
        onCancel: () => {
          console.log('Unstake cancelled');
        },
      });

      return txId;
    } catch (error) {
      console.error('Error unregistering stake:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Claim rewards
  const claimRewards = async () => {
    if (!connected) throw new Error('Wallet not connected');

    setLoading(true);
    try {
      const txId = await callContract({
        contractAddress: CONTRACTS.LP_STAKING.address,
        contractName: CONTRACTS.LP_STAKING.name,
        functionName: 'claim-rewards',
        functionArgs: [],
        postConditions: [],
        onFinish: (data: any) => {
          console.log('Rewards claimed:', data);
          fetchPendingRewards();
          fetchStakeInfo();
        },
        onCancel: () => {
          console.log('Claim cancelled');
        },
      });

      return txId;
    } catch (error) {
      console.error('Error claiming rewards:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Calculate APR (approximate)
  const calculateAPR = (): number => {
    if (totalStaked === 0) return 0;

    const blocksPerYear = 52560; // ~10 min blocks
    const yearlyRewards = REWARD_PER_BLOCK * blocksPerYear;
    const apr = (yearlyRewards / totalStaked) * 100;

    return apr;
  };

  // Auto-fetch when wallet connects
  useEffect(() => {
    fetchTotalStaked();
    checkInitialized();

    if (connected && address) {
      fetchStakeInfo();
      fetchPendingRewards();
    }
  }, [connected, address]);

  return {
    // State
    stakeInfo,
    pendingRewards,
    totalStaked,
    isInitialized,
    loading,
    contractId,
    apr: calculateAPR(),

    // Functions
    initialize,
    registerStake,
    unregisterStake,
    claimRewards,
    fetchStakeInfo,
    fetchPendingRewards,
    fetchTotalStaked,
    checkInitialized,
  };
};
