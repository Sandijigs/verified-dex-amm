const {
  makeContractDeploy,
  broadcastTransaction,
  AnchorMode,
  PostConditionMode,
} = require('@stacks/transactions');
const { STACKS_TESTNET } = require('@stacks/network');
const { generateWallet } = require('@stacks/wallet-sdk');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuration from .env
const MNEMONIC = process.env.MNEMONIC;
const DEPLOYER_ADDRESS = process.env.TESTNET_ADDRESS || 'ST1WPQWDNG2H8VMG93PW3JM74SGXVTA38ETGZ64F8';
const NETWORK = STACKS_TESTNET;

// Contracts to deploy (in order - only missing ones)
const contracts = [
  { name: 'sbtc-pool', path: 'contracts/core/sbtc-pool.clar', fee: 200000 },
  { name: 'lp-staking', path: 'contracts/farming/lp-staking.clar', fee: 200000 },
];

async function deployContract(contractName, contractPath, fee, senderKey) {
  console.log(`\n📝 Deploying ${contractName}...`);

  try {
    // Read contract code
    const codeBody = fs.readFileSync(path.join(__dirname, contractPath), 'utf8');

    // Create transaction
    const txOptions = {
      contractName,
      codeBody,
      senderKey,
      network: NETWORK,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
      fee: BigInt(fee),
    };

    const transaction = await makeContractDeploy(txOptions);

    // Broadcast
    console.log(`📡 Broadcasting ${contractName}...`);
    const response = await broadcastTransaction({transaction, network: NETWORK});

    if (response.error) {
      console.error(`❌ Error:`, response.error);
      console.error(`   Reason:`, response.reason || 'Unknown');
      return null;
    }

    console.log(`✅ ${contractName} deployed!`);
    console.log(`   TX: ${response.txid}`);
    console.log(`   Explorer: https://explorer.hiro.so/txid/${response.txid}?chain=testnet`);

    return response.txid;
  } catch (error) {
    console.error(`❌ Failed:`, error.message);
    return null;
  }
}

async function main() {
  console.log('\n🚀 TESTNET DEPLOYMENT - REMAINING CONTRACTS');
  console.log('='.repeat(60));
  console.log(`Network: Stacks Testnet`);
  console.log(`Deployer: ${DEPLOYER_ADDRESS}`);
  console.log(`Contracts: ${contracts.length}`);
  console.log('='.repeat(60));

  // Generate wallet from mnemonic
  console.log('\n🔑 Loading wallet...');
  const wallet = await generateWallet({
    secretKey: MNEMONIC,
    password: '',
  });

  console.log('Wallet:', wallet);
  console.log('Accounts:', wallet.accounts);

  if (!wallet.accounts || wallet.accounts.length === 0) {
    console.error('❌ No accounts in wallet!');
    process.exit(1);
  }

  const senderKey = wallet.accounts[0].stxPrivateKey;
  console.log('✅ Wallet loaded');
  console.log(`   Private Key: ${senderKey ? 'Found' : 'NOT FOUND'}\n`);

  // Deploy each contract
  const deployedContracts = [];

  for (let i = 0; i < contracts.length; i++) {
    const contract = contracts[i];
    console.log(`\n[${i + 1}/${contracts.length}] Deploying ${contract.name}...`);

    const txid = await deployContract(
      contract.name,
      contract.path,
      contract.fee,
      senderKey
    );

    if (txid) {
      deployedContracts.push({ name: contract.name, txid });

      // Wait between deployments
      if (i < contracts.length - 1) {
        console.log('\n⏳ Waiting 30 seconds before next deployment...');
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    } else {
      console.log(`\n⚠️  Skipping remaining deployments due to error.`);
      break;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 DEPLOYMENT SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total: ${contracts.length}`);
  console.log(`Deployed: ${deployedContracts.length}`);
  console.log(`Failed: ${contracts.length - deployedContracts.length}`);

  if (deployedContracts.length > 0) {
    console.log('\n✅ Successfully deployed contracts:');
    deployedContracts.forEach(({ name, txid }) => {
      console.log(`   - ${name}`);
      console.log(`     https://explorer.hiro.so/txid/${txid}?chain=testnet`);
    });
  }

  console.log('\n' + '='.repeat(60));
}

main().catch(console.error);
