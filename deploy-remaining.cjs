const {
  makeContractDeploy,
  broadcastTransaction,
  AnchorMode,
  PostConditionMode,
} = require('./frontend/node_modules/@stacks/transactions');
const { StacksMainnet } = require('./frontend/node_modules/@stacks/network');
const { generateWallet } = require('./frontend/node_modules/@stacks/wallet-sdk');
const fs = require('fs');
const path = require('path');

const MNEMONIC = 'elder clump monitor ask name idea eager glory small deposit parade coral ball common short vanish luggage wrestle neutral cattle again unusual rifle champion';
const DEPLOYER_ADDRESS = 'SP1WPQWDNG2H8VMG93PW3JM74SGXVTA38EVCH7GYS';
const NETWORK = new StacksMainnet();

// Remaining contracts to deploy (skipping sip-010-trait which is already deployed)
const contracts = [
  { name: 'test-token', path: 'contracts/tokens/test-token.clar', fee: 30000 },
  { name: 'vdex-token', path: 'contracts/tokens/vdex-token.clar', fee: 150000 },
  { name: 'sbtc-pool-minimal', path: 'contracts/core/sbtc-pool-minimal.clar', fee: 180000 },
  { name: 'lp-staking-final', path: 'contracts/farming/lp-staking-final.clar', fee: 200000 },
];

async function getCurrentNonce(address) {
  const response = await fetch(`https://api.hiro.so/extended/v1/address/${address}/nonces`);
  const data = await response.json();
  return data.possible_next_nonce;
}

async function waitForNonceUpdate(address, expectedNonce, maxWait = 180000) {
  console.log(`   ⏳ Waiting for nonce to reach ${expectedNonce}...`);
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    const currentNonce = await getCurrentNonce(address);
    if (currentNonce >= expectedNonce) {
      console.log(`   ✅ Nonce updated to ${currentNonce}`);
      return currentNonce;
    }
    await new Promise(resolve => setTimeout(resolve, 5000)); // Check every 5 seconds
  }

  throw new Error(`Timeout waiting for nonce to update to ${expectedNonce}`);
}

async function deployContract(contractName, contractPath, fee, senderKey, nonce) {
  console.log(`\n📝 Deploying ${contractName} (nonce: ${nonce})...`);

  try {
    const codeBody = fs.readFileSync(path.join(__dirname, contractPath), 'utf8');

    const txOptions = {
      contractName,
      codeBody,
      senderKey,
      network: NETWORK,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
      fee: BigInt(fee),
      nonce: BigInt(nonce),
    };

    const transaction = await makeContractDeploy(txOptions);
    console.log(`   📡 Broadcasting...`);
    const response = await broadcastTransaction(transaction, NETWORK);

    if (response.error) {
      console.error(`   ❌ Error:`, response.error);
      console.error(`      Reason:`, response.reason || 'Unknown');
      return null;
    }

    console.log(`   ✅ Deployed!`);
    console.log(`   TX: ${response.txid}`);
    console.log(`   🔗 https://explorer.hiro.so/txid/${response.txid}?chain=mainnet`);
    return response.txid;
  } catch (error) {
    console.error(`   ❌ Failed:`, error.message);
    return null;
  }
}

async function main() {
  console.log('\n🚀 DEPLOYING REMAINING CONTRACTS TO MAINNET');
  console.log('='.repeat(60));

  const wallet = await generateWallet({ secretKey: MNEMONIC, password: '' });
  const senderKey = wallet.accounts[0].stxPrivateKey;

  // Get current nonce
  let currentNonce = await getCurrentNonce(DEPLOYER_ADDRESS);
  console.log(`📍 Starting nonce: ${currentNonce}\n`);

  const deployed = [];

  for (let i = 0; i < contracts.length; i++) {
    const contract = contracts[i];
    console.log(`[${i + 1}/${contracts.length}] ${contract.name}`);

    const txid = await deployContract(
      contract.name,
      contract.path,
      contract.fee,
      senderKey,
      currentNonce
    );

    if (txid) {
      deployed.push({ name: contract.name, txid });
      currentNonce++;

      // Wait for nonce to update before next deployment
      if (i < contracts.length - 1) {
        await waitForNonceUpdate(DEPLOYER_ADDRESS, currentNonce);
      }
    } else {
      console.log(`\n⚠️  Deployment failed. Stopping.`);
      break;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Deployed ${deployed.length}/${contracts.length} contracts`);
  console.log('='.repeat(60) + '\n');

  deployed.forEach(({ name, txid }) => {
    console.log(`✓ ${name}`);
    console.log(`  https://explorer.hiro.so/txid/${txid}?chain=mainnet\n`);
  });
}

main().catch(console.error);
