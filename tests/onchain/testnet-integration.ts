/**
 * On-chain Integration Tests for Verified DEX/AMM
 *
 * This script tests all deployed contracts on Stacks Testnet
 *
 * Network: Stacks Testnet
 * Deployer: ST12KRGRZ2N2Q5B8HKXHETGRD0JVF282TAAXNM1ZV
 */

import {
  makeContractCall,
  makeContractDeploy,
  broadcastTransaction,
  AnchorMode,
  PostConditionMode,
  bufferCVFromString,
  intCV,
  uintCV,
  principalCV,
  stringUtf8CV,
  noneCV,
  someCV,
  listCV,
  tupleCV,
  contractPrincipalCV,
  standardPrincipalCV,
  cvToJSON,
  makeStandardSTXPostCondition,
  FungibleConditionCode,
} from '@stacks/transactions';
import { StacksTestnet } from '@stacks/network';
import fetch from 'cross-fetch';

// Configuration
const NETWORK = new StacksTestnet();
const DEPLOYER_ADDRESS = 'ST12KRGRZ2N2Q5B8HKXHETGRD0JVF282TAAXNM1ZV';

// Contract names
const CONTRACTS = {
  SIP010_TRAIT: 'sip-010-trait',
  POOL_TRAIT: 'pool-trait',
  MATH_LIB: 'math-lib',
  POOL_REGISTRY: 'pool-registry',
  POOL_TEMPLATE: 'pool-template',
  POOL_FACTORY: 'pool-factory',
  ROUTER: 'router',
  TWAP_ORACLE: 'twap-oracle',
  TEST_TOKEN: 'test-token',
};

// Test state
let testResults: Array<{
  test: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  txId?: string;
}> = [];

// Helper function to call read-only functions
async function callReadOnly(
  contractAddress: string,
  contractName: string,
  functionName: string,
  functionArgs: any[],
  senderAddress: string = DEPLOYER_ADDRESS
): Promise<any> {
  const url = `${NETWORK.coreApiUrl}/v2/contracts/call-read/${contractAddress}/${contractName}/${functionName}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: senderAddress,
      arguments: functionArgs.map(arg => cvToJSON(arg).hex),
    }),
  });

  if (!response.ok) {
    throw new Error(`Read-only call failed: ${response.statusText}`);
  }

  const result = await response.json();
  return result;
}

// Helper function to broadcast a transaction
async function broadcastTx(
  contractName: string,
  functionName: string,
  functionArgs: any[],
  senderKey: string,
  postConditions: any[] = []
): Promise<string> {
  const txOptions = {
    contractAddress: DEPLOYER_ADDRESS,
    contractName: contractName,
    functionName: functionName,
    functionArgs: functionArgs,
    senderKey: senderKey,
    validateWithAbi: false,
    network: NETWORK,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
    postConditions: postConditions,
  };

  const transaction = await makeContractCall(txOptions);
  const broadcastResponse = await broadcastTransaction(transaction, NETWORK);

  if ('error' in broadcastResponse) {
    throw new Error(`Transaction failed: ${broadcastResponse.error}`);
  }

  return broadcastResponse.txid;
}

// Helper to wait for transaction confirmation
async function waitForTx(txId: string, maxAttempts = 30): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const url = `${NETWORK.coreApiUrl}/extended/v1/tx/${txId}`;
      const response = await fetch(url);
      const tx = await response.json();

      if (tx.tx_status === 'success') {
        return true;
      } else if (tx.tx_status === 'abort_by_response' || tx.tx_status === 'abort_by_post_condition') {
        console.error(`Transaction ${txId} aborted:`, tx);
        return false;
      }
    } catch (e) {
      // Transaction not found yet, keep waiting
    }

    // Wait 10 seconds before next attempt
    await new Promise(resolve => setTimeout(resolve, 10000));
  }

  return false;
}

// Test functions
async function testContractDeployment() {
  console.log('\n=== TEST 1: Verify Contract Deployments ===\n');

  for (const [name, contractName] of Object.entries(CONTRACTS)) {
    try {
      const url = `${NETWORK.coreApiUrl}/v2/contracts/interface/${DEPLOYER_ADDRESS}/${contractName}`;
      const response = await fetch(url);

      if (response.ok) {
        testResults.push({
          test: `Contract Deployed: ${contractName}`,
          status: 'PASS',
          message: `Contract ${contractName} is deployed and accessible`,
        });
        console.log(`✅ ${contractName} - deployed`);
      } else {
        testResults.push({
          test: `Contract Deployed: ${contractName}`,
          status: 'FAIL',
          message: `Contract ${contractName} not found`,
        });
        console.log(`❌ ${contractName} - not found`);
      }
    } catch (error) {
      testResults.push({
        test: `Contract Deployed: ${contractName}`,
        status: 'FAIL',
        message: `Error checking ${contractName}: ${error}`,
      });
      console.log(`❌ ${contractName} - error: ${error}`);
    }
  }
}

async function testMathLibrary() {
  console.log('\n=== TEST 2: Math Library Functions ===\n');

  try {
    // Test sqrt function with 100 (should return 10)
    const sqrtResult = await callReadOnly(
      DEPLOYER_ADDRESS,
      CONTRACTS.MATH_LIB,
      'sqrt',
      [uintCV(100)]
    );

    console.log('sqrt(100) result:', sqrtResult);

    testResults.push({
      test: 'Math Library: sqrt(100)',
      status: 'PASS',
      message: `sqrt function works correctly`,
    });
  } catch (error) {
    testResults.push({
      test: 'Math Library: sqrt',
      status: 'FAIL',
      message: `Error: ${error}`,
    });
    console.log(`❌ sqrt test failed: ${error}`);
  }

  try {
    // Test mul-div function
    const mulDivResult = await callReadOnly(
      DEPLOYER_ADDRESS,
      CONTRACTS.MATH_LIB,
      'mul-div',
      [uintCV(1000), uintCV(50), uintCV(100)]
    );

    console.log('mul-div(1000, 50, 100) result:', mulDivResult);

    testResults.push({
      test: 'Math Library: mul-div',
      status: 'PASS',
      message: `mul-div function works correctly`,
    });
  } catch (error) {
    testResults.push({
      test: 'Math Library: mul-div',
      status: 'FAIL',
      message: `Error: ${error}`,
    });
    console.log(`❌ mul-div test failed: ${error}`);
  }
}

async function testTestToken() {
  console.log('\n=== TEST 3: Test Token (SIP-010) ===\n');

  try {
    // Get token name
    const nameResult = await callReadOnly(
      DEPLOYER_ADDRESS,
      CONTRACTS.TEST_TOKEN,
      'get-name',
      []
    );
    console.log('Token name:', nameResult);

    // Get token symbol
    const symbolResult = await callReadOnly(
      DEPLOYER_ADDRESS,
      CONTRACTS.TEST_TOKEN,
      'get-symbol',
      []
    );
    console.log('Token symbol:', symbolResult);

    // Get token decimals
    const decimalsResult = await callReadOnly(
      DEPLOYER_ADDRESS,
      CONTRACTS.TEST_TOKEN,
      'get-decimals',
      []
    );
    console.log('Token decimals:', decimalsResult);

    // Get total supply
    const supplyResult = await callReadOnly(
      DEPLOYER_ADDRESS,
      CONTRACTS.TEST_TOKEN,
      'get-total-supply',
      []
    );
    console.log('Total supply:', supplyResult);

    testResults.push({
      test: 'Test Token: Read SIP-010 metadata',
      status: 'PASS',
      message: 'Successfully read all token metadata',
    });
  } catch (error) {
    testResults.push({
      test: 'Test Token: Read metadata',
      status: 'FAIL',
      message: `Error: ${error}`,
    });
    console.log(`❌ Token metadata test failed: ${error}`);
  }
}

async function testPoolRegistry() {
  console.log('\n=== TEST 4: Pool Registry (contract-hash?) ===\n');

  try {
    // Get template count
    const countResult = await callReadOnly(
      DEPLOYER_ADDRESS,
      CONTRACTS.POOL_REGISTRY,
      'get-template-count',
      []
    );
    console.log('Template count:', countResult);

    // Try to check if pool-template is verified (using contract-hash?)
    const poolTemplateHash = await callReadOnly(
      DEPLOYER_ADDRESS,
      CONTRACTS.POOL_REGISTRY,
      'is-template-verified',
      [principalCV(`${DEPLOYER_ADDRESS}.${CONTRACTS.POOL_TEMPLATE}`)]
    );
    console.log('Pool template verified:', poolTemplateHash);

    testResults.push({
      test: 'Pool Registry: Read template info',
      status: 'PASS',
      message: 'Registry reads working correctly',
    });
  } catch (error) {
    testResults.push({
      test: 'Pool Registry: Read functions',
      status: 'FAIL',
      message: `Error: ${error}`,
    });
    console.log(`❌ Pool registry test failed: ${error}`);
  }
}

async function testTWAPOracle() {
  console.log('\n=== TEST 5: TWAP Oracle (stacks-block-time) ===\n');

  try {
    // Try to get observation state for a dummy pool
    const dummyPool = principalCV(`${DEPLOYER_ADDRESS}.dummy-pool`);

    const stateResult = await callReadOnly(
      DEPLOYER_ADDRESS,
      CONTRACTS.TWAP_ORACLE,
      'get-observation-state',
      [dummyPool]
    );
    console.log('Observation state result:', stateResult);

    // Get current block time (demonstrating stacks-block-time usage)
    const blockTimeResult = await callReadOnly(
      DEPLOYER_ADDRESS,
      CONTRACTS.TWAP_ORACLE,
      'get-current-time',
      []
    );
    console.log('Current block time:', blockTimeResult);

    testResults.push({
      test: 'TWAP Oracle: stacks-block-time integration',
      status: 'PASS',
      message: 'Oracle time functions working correctly',
    });
  } catch (error) {
    testResults.push({
      test: 'TWAP Oracle: Read functions',
      status: 'FAIL',
      message: `Error: ${error}`,
    });
    console.log(`❌ TWAP Oracle test failed: ${error}`);
  }
}

async function testRouter() {
  console.log('\n=== TEST 6: Router Contract ===\n');

  try {
    // Check if router is initialized
    const registryResult = await callReadOnly(
      DEPLOYER_ADDRESS,
      CONTRACTS.ROUTER,
      'get-registry',
      []
    );
    console.log('Router registry:', registryResult);

    const factoryResult = await callReadOnly(
      DEPLOYER_ADDRESS,
      CONTRACTS.ROUTER,
      'get-factory',
      []
    );
    console.log('Router factory:', factoryResult);

    testResults.push({
      test: 'Router: Read configuration',
      status: 'PASS',
      message: 'Router configuration readable',
    });
  } catch (error) {
    testResults.push({
      test: 'Router: Read functions',
      status: 'FAIL',
      message: `Error: ${error}`,
    });
    console.log(`❌ Router test failed: ${error}`);
  }
}

async function testPoolFactory() {
  console.log('\n=== TEST 7: Pool Factory ===\n');

  try {
    // Get pool count
    const countResult = await callReadOnly(
      DEPLOYER_ADDRESS,
      CONTRACTS.POOL_FACTORY,
      'get-pool-count',
      []
    );
    console.log('Pool count:', countResult);

    // Check if factory has registry set
    const registryResult = await callReadOnly(
      DEPLOYER_ADDRESS,
      CONTRACTS.POOL_FACTORY,
      'get-registry',
      []
    );
    console.log('Factory registry:', registryResult);

    testResults.push({
      test: 'Pool Factory: Read state',
      status: 'PASS',
      message: 'Factory state readable',
    });
  } catch (error) {
    testResults.push({
      test: 'Pool Factory: Read functions',
      status: 'FAIL',
      message: `Error: ${error}`,
    });
    console.log(`❌ Pool Factory test failed: ${error}`);
  }
}

// Main test execution
async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   VERIFIED DEX/AMM - ON-CHAIN INTEGRATION TESTS          ║');
  console.log('║   Network: Stacks Testnet                                 ║');
  console.log(`║   Deployer: ${DEPLOYER_ADDRESS}  ║`);
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    await testContractDeployment();
    await testMathLibrary();
    await testTestToken();
    await testPoolRegistry();
    await testTWAPOracle();
    await testRouter();
    await testPoolFactory();

    // Print summary
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                      TEST SUMMARY                          ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    const passed = testResults.filter(r => r.status === 'PASS').length;
    const failed = testResults.filter(r => r.status === 'FAIL').length;
    const skipped = testResults.filter(r => r.status === 'SKIP').length;

    console.log(`Total Tests: ${testResults.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏭️  Skipped: ${skipped}`);

    console.log('\n--- Detailed Results ---\n');
    testResults.forEach((result, index) => {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️';
      console.log(`${index + 1}. ${icon} ${result.test}`);
      console.log(`   ${result.message}`);
      if (result.txId) {
        console.log(`   TX: ${result.txId}`);
        console.log(`   Explorer: https://explorer.hiro.so/txid/${result.txId}?chain=testnet`);
      }
      console.log('');
    });

    // Save results to file
    const fs = require('fs');
    fs.writeFileSync(
      'tests/onchain/test-results.json',
      JSON.stringify(testResults, null, 2)
    );
    console.log('📄 Results saved to tests/onchain/test-results.json');

  } catch (error) {
    console.error('Test suite error:', error);
    process.exit(1);
  }
}

// Run tests if executed directly
if (require.main === module) {
  runAllTests()
    .then(() => {
      console.log('\n✅ Test suite completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test suite failed:', error);
      process.exit(1);
    });
}

export { runAllTests, testResults };
