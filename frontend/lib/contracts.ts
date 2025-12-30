// Phase 1 Deployed Contracts Configuration
// Network: Stacks Mainnet
// Deployer: SP1WPQWDNG2H8VMG93PW3JM74SGXVTA38EVCH7GYS

export const NETWORK = 'mainnet';
export const DEPLOYER_ADDRESS = 'SP1WPQWDNG2H8VMG93PW3JM74SGXVTA38EVCH7GYS';

// Contract Addresses
export const CONTRACTS = {
  // SIP-010 Trait
  SIP010_TRAIT: {
    address: DEPLOYER_ADDRESS,
    name: 'sip-010-trait',
  },

  // Test Token (Mock sBTC)
  TEST_TOKEN: {
    address: DEPLOYER_ADDRESS,
    name: 'test-token',
  },

  // VDEX Governance Token
  VDEX_TOKEN: {
    address: DEPLOYER_ADDRESS,
    name: 'vdex-token',
  },

  // sBTC Pool (AMM)
  SBTC_POOL: {
    address: DEPLOYER_ADDRESS,
    name: 'sbtc-pool-minimal',
  },

  // LP Staking
  LP_STAKING: {
    address: DEPLOYER_ADDRESS,
    name: 'lp-staking-final',
  },
} as const;

// Helper function to get full contract identifier
export const getContractId = (contract: keyof typeof CONTRACTS): string => {
  const { address, name } = CONTRACTS[contract];
  return `${address}.${name}`;
};

// Token decimals
export const DECIMALS = {
  VDEX: 6,
  STX: 6,
  SBTC: 8,
} as const;

// Helper functions for token amounts
export const toMicroUnits = (amount: number, decimals: number): number => {
  return Math.floor(amount * Math.pow(10, decimals));
};

export const fromMicroUnits = (amount: number, decimals: number): number => {
  return amount / Math.pow(10, decimals);
};

// VDEX Token constants
export const VDEX_TOTAL_SUPPLY = 1_000_000_000; // 1 billion
export const VDEX_ALLOCATION = {
  FARMING: 400_000_000, // 40%
  TREASURY: 300_000_000, // 30%
  TEAM: 150_000_000, // 15%
  AIRDROP: 100_000_000, // 10%
  LIQUIDITY: 50_000_000, // 5%
} as const;

// Staking reward rate
export const REWARD_PER_BLOCK = toMicroUnits(100, DECIMALS.VDEX); // 100 VDEX per block

// Pool fee (basis points)
export const POOL_FEE_BPS = 30; // 0.3%

// Explorer URLs
export const EXPLORER_URL = 'https://explorer.hiro.so';
export const getContractUrl = (contractName: keyof typeof CONTRACTS): string => {
  return `${EXPLORER_URL}/txid/${getContractId(contractName)}?chain=${NETWORK}`;
};

export const getTxUrl = (txId: string): string => {
  return `${EXPLORER_URL}/txid/${txId}?chain=${NETWORK}`;
};
