/**
 * Contract Addresses for Verified DEX/AMM
 * Network: Stacks Testnet
 * Deployer: ST12KRGRZ2N2Q5B8HKXHETGRD0JVF282TAAXNM1ZV
 */

export const NETWORK = 'testnet' as const

export const DEPLOYER_ADDRESS = 'ST12KRGRZ2N2Q5B8HKXHETGRD0JVF282TAAXNM1ZV'

export const CONTRACT_ADDRESSES = {
  // Traits
  SIP010_TRAIT: `${DEPLOYER_ADDRESS}.sip-010-trait`,
  POOL_TRAIT: `${DEPLOYER_ADDRESS}.pool-trait`,

  // Core Contracts
  MATH_LIB: `${DEPLOYER_ADDRESS}.math-lib`,
  POOL_REGISTRY: `${DEPLOYER_ADDRESS}.pool-registry`,
  POOL_TEMPLATE: `${DEPLOYER_ADDRESS}.pool-template`,
  POOL_FACTORY: `${DEPLOYER_ADDRESS}.pool-factory`,
  ROUTER: `${DEPLOYER_ADDRESS}.router`,
  TWAP_ORACLE: `${DEPLOYER_ADDRESS}.twap-oracle`,

  // Test Token
  TEST_TOKEN: `${DEPLOYER_ADDRESS}.test-token`,
} as const

export const CONTRACT_NAMES = {
  ROUTER: 'router',
  POOL_FACTORY: 'pool-factory',
  POOL_TEMPLATE: 'pool-template',
  POOL_REGISTRY: 'pool-registry',
  TWAP_ORACLE: 'twap-oracle',
  MATH_LIB: 'math-lib',
  TEST_TOKEN: 'test-token',
} as const

// Transaction IDs for verification
export const DEPLOYMENT_TXS = {
  SIP010_TRAIT: '6d36f17e3fdce53cb5234e501e8be359fb592f51273e4063f4ba6bca5db76ccd',
  POOL_TRAIT: '12470b233b37920ea3da9e2eecfe3d588a0f71d487fef71dddbb6ccd6588b262',
  MATH_LIB: '22a6816f43ad506e5a322aa49ee0ce1a08f73ff901913abfd4385a323689ead7',
  POOL_REGISTRY: '092f206f88c5aac347b395256dea3e6918243fffdc0e7aac40e4df9e21ab0b8d',
  POOL_TEMPLATE: 'b7d0c00bc1cd190e2c84e092fe8cc12048ef8c68dadd1af3299220b183aa34ce',
  POOL_FACTORY: '112240fe1b184803a9f578ab7d9ada5dd9d73c1aa7fe88b07a151274f8808b63',
  ROUTER: '153effa55df830e34c587453c7a1da8817aba1144551c81b3271c080ebf9f68d',
  TWAP_ORACLE: 'd7bd766e4c67604bfa4cb3a4c6b81f5b892e52b2ba0f118d5b64396ff321cd1c',
  TEST_TOKEN: '2891a82729505fa26fd777e722ad1ea489c52c0f3579573648da4dd82195de7e',
} as const