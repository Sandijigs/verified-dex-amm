import {
  makeContractDeploy,
  broadcastTransaction,
  AnchorMode,
  PostConditionMode,
  StacksMainnet,
} from '@stacks/transactions';
import { readFileSync } from 'fs';
import { join } from 'path';

// Configuration
const NETWORK = new StacksMainnet();
const MNEMONIC = process.env.MNEMONIC || '';
const DEPLOYER_ADDRESS = process.env.DEPLOYER_ADDRESS || '';

// Contract deployment configuration
const contracts = [
  {
    name: 'sip-010-trait',
    path: 'contracts/traits/sip-010-trait.clar',
    fee: 10000,
  },
  {
    name: 'test-token',
    path: 'contracts/tokens/test-token.clar',
    fee: 30000,
  },
  {
    name: 'vdex-token',
    path: 'contracts/tokens/vdex-token.clar',
    fee: 150000,
  },
  {
    name: 'sbtc-pool-minimal',
    path: 'contracts/core/sbtc-pool-minimal.clar',
    fee: 180000,
  },
  {
    name: 'lp-staking-final',
    path: 'contracts/farming/lp-staking-final.clar',
    fee: 200000,
  },
];

async function deployContract(contractName: string, contractPath: string, fee: number, senderKey: string) {
  console.log(`\n📝 Deploying ${contractName}...`);

  try {
    // Read contract source code
    const codeBody = readFileSync(join(__dirname, contractPath), 'utf8');

    // Create contract deploy transaction
    const txOptions = {
      contractName,
      codeBody,
      senderKey,
      network: NETWORK,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
      fee,
    };

    const transaction = await makeContractDeploy(txOptions);

    // Broadcast transaction
    console.log(`📡 Broadcasting transaction for ${contractName}...`);
    const broadcastResponse = await broadcastTransaction(transaction, NETWORK);

    if ('error' in broadcastResponse) {
      console.error(`❌ Error deploying ${contractName}:`, broadcastResponse.error);
      if ('reason' in broadcastResponse) {
        console.error('Reason:', broadcastResponse.reason);
      }
      return null;
    }

    console.log(`✅ ${contractName} deployed!`);
    console.log(`   TX ID: ${broadcastResponse.txid}`);
    console.log(`   Explorer: https://explorer.hiro.so/txid/${broadcastResponse.txid}?chain=mainnet`);

    return broadcastResponse.txid;
  } catch (error) {
    console.error(`❌ Failed to deploy ${contractName}:`, error);
    return null;
  }
}

async function deployAll() {
  console.log('🚀 Starting Mainnet Deployment');
  console.log('================================');
  console.log(`Network: Mainnet`);
  console.log(`Deployer: ${DEPLOYER_ADDRESS}`);
  console.log(`Total Contracts: ${contracts.length}`);
  console.log('================================\n');

  if (!MNEMONIC) {
    console.error('❌ Error: MNEMONIC not set in environment');
    process.exit(1);
  }

  // Generate private key from mnemonic
  const { generateWallet } = await import('@stacks/wallet-sdk');
  const wallet = await generateWallet({
    secretKey: MNEMONIC,
    password: '',
  });

  const account = wallet.accounts[0];
  const senderKey = account.stxPrivateKey;

  console.log('🔑 Wallet loaded successfully\n');

  // Deploy contracts sequentially
  for (const contract of contracts) {
    const txid = await deployContract(contract.name, contract.path, contract.fee, senderKey);

    if (!txid) {
      console.log(`\n⚠️  Deployment of ${contract.name} failed. Stopping deployment.`);
      break;
    }

    // Wait a bit between deployments to avoid nonce issues
    if (contract !== contracts[contracts.length - 1]) {
      console.log('\n⏳ Waiting 30 seconds before next deployment...');
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
  }

  console.log('\n================================');
  console.log('🎉 Deployment Complete!');
  console.log('================================');
}

// Run deployment
deployAll().catch(console.error);
