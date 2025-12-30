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

// Configuration from .env
const MNEMONIC = 'elder clump monitor ask name idea eager glory small deposit parade coral ball common short vanish luggage wrestle neutral cattle again unusual rifle champion';
const DEPLOYER_ADDRESS = 'SP1WPQWDNG2H8VMG93PW3JM74SGXVTA38EVCH7GYS';
const NETWORK = new StacksMainnet();

// Contracts to deploy (in order)
const contracts = [
  { name: 'sip-010-trait', path: 'contracts/traits/sip-010-trait.clar', fee: 10000 },
  { name: 'test-token', path: 'contracts/tokens/test-token.clar', fee: 30000 },
  { name: 'vdex-token', path: 'contracts/tokens/vdex-token.clar', fee: 150000 },
  { name: 'sbtc-pool-minimal', path: 'contracts/core/sbtc-pool-minimal.clar', fee: 180000 },
  { name: 'lp-staking-final', path: 'contracts/farming/lp-staking-final.clar', fee: 200000 },
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
    const response = await broadcastTransaction(transaction, NETWORK);

    if (response.error) {
      console.error(`❌ Error:`, response.error);
      console.error(`   Reason:`, response.reason || 'Unknown');
      return null;
    }

    console.log(`✅ ${contractName} deployed!`);
    console.log(`   TX: ${response.txid}`);
    console.log(`   Explorer: https://explorer.hiro.so/txid/${response.txid}?chain=mainnet`);

    return response.txid;
  } catch (error) {
    console.error(`❌ Failed:`, error.message);
    return null;
  }
}

async function main() {
  console.log('\n🚀 MAINNET DEPLOYMENT');
  console.log('='.repeat(60));
  console.log(`Network: Stacks Mainnet`);
  console.log(`Deployer: ${DEPLOYER_ADDRESS}`);
  console.log(`Contracts: ${contracts.length}`);
  console.log('='.repeat(60));

  // Generate wallet from mnemonic
  console.log('\n🔑 Loading wallet...');
  const wallet = await generateWallet({
    secretKey: MNEMONIC,
    password: '',
  });

  const senderKey = wallet.accounts[0].stxPrivateKey;
  console.log('✅ Wallet loaded\n');

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

      // Wait between deployments (except for last one)
      if (i < contracts.length - 1) {
        console.log('\n⏳ Waiting 30 seconds for next deployment...');
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    } else {
      console.log(`\n⚠️  Failed to deploy ${contract.name}. Stopping.`);
      break;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 DEPLOYMENT SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Deployed: ${deployedContracts.length}/${contracts.length} contracts\n`);

  deployedContracts.forEach(({ name, txid }) => {
    console.log(`✓ ${name}`);
    console.log(`  https://explorer.hiro.so/txid/${txid}?chain=mainnet\n`);
  });

  console.log('='.repeat(60));
  console.log('🎉 Done!');
  console.log('='.repeat(60) + '\n');
}

main().catch(error => {
  console.error('\n❌ Deployment failed:', error);
  process.exit(1);
});
