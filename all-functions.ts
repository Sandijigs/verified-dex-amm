import { DEPLOYER_ADDRESS, getContractUrl } from './interact-contracts.ts';

console.log('\n' + '='.repeat(70));
console.log('🎯 ALL AVAILABLE FUNCTIONS FOR ONCHAIN ACTIVITY');
console.log('='.repeat(70));

console.log('\n📋 TEST-TOKEN FUNCTIONS:\n');
console.log('Contract: ' + getContractUrl('test-token'));

console.log('\n✅ Already Done:');
console.log('  1. ✓ mint - Minted 4M test tokens');

console.log('\n🔥 Available Functions to Execute:\n');

console.log('2. TRANSFER - Transfer tokens to another address');
console.log('   Parameters:');
console.log('   - amount: 500000000000 (500k tokens)');
console.log('   - sender: ' + DEPLOYER_ADDRESS);
console.log('   - recipient: ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC');
console.log('   - memo: 0x74657374 (optional)\n');

console.log('3. BURN - Burn some of your tokens');
console.log('   Parameters:');
console.log('   - amount: 100000000000 (100k tokens)\n');

console.log('4. SET-TOKEN-URI - Set metadata URI for token');
console.log('   Parameters:');
console.log('   - uri: (some u"https://mytoken.io/metadata.json")\n');

console.log('5. MINT-MANY - Batch mint to multiple addresses');
console.log('   Parameters:');
console.log('   - recipients: (list {to: ST2..., amount: u1000000} {to: ST3..., amount: u2000000})\n');

console.log('\n' + '='.repeat(70));
console.log('📋 VDEX-TOKEN FUNCTIONS:\n');
console.log('Contract: ' + getContractUrl('vdex-token'));

console.log('\n🔥 Available Functions to Execute:\n');

console.log('1. INITIALIZE - Initialize token distribution (ONE TIME ONLY)');
console.log('   Parameters:');
console.log('   - treasury-address: ' + DEPLOYER_ADDRESS);
console.log('   This will mint:');
console.log('   - 300M VDEX to treasury');
console.log('   - 50M VDEX for initial liquidity\n');

console.log('2. TRANSFER - Transfer VDEX tokens');
console.log('   Parameters:');
console.log('   - amount: 1000000 (1 VDEX)');
console.log('   - sender: ' + DEPLOYER_ADDRESS);
console.log('   - recipient: ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC');
console.log('   - memo: (none)\n');

console.log('3. AUTHORIZE-MINTER - Authorize farming contract to mint rewards');
console.log('   Parameters:');
console.log('   - minter: ST1WPQWDNG2H8VMG93PW3JM74SGXVTA38ETGZ64F8.lp-staking\n');

console.log('\n' + '='.repeat(70));
console.log('🎬 RECOMMENDED EXECUTION ORDER:');
console.log('='.repeat(70));

console.log('\n1️⃣  VDEX: Initialize (creates 350M tokens!)');
console.log('2️⃣  TEST: Transfer tokens');
console.log('3️⃣  TEST: Burn tokens');
console.log('4️⃣  VDEX: Transfer tokens');
console.log('5️⃣  TEST: Set token URI');
console.log('6️⃣  TEST: Mint-many to multiple addresses');

console.log('\n💡 Each transaction creates onchain activity for your challenge!');
console.log('='.repeat(70) + '\n');

console.log('🌐 Open contracts in browser:');
console.log('Test Token:  https://explorer.hiro.so/txid/ST1WPQWDNG2H8VMG93PW3JM74SGXVTA38ETGZ64F8.test-token?chain=testnet');
console.log('VDEX Token:  https://explorer.hiro.so/txid/ST1WPQWDNG2H8VMG93PW3JM74SGXVTA38ETGZ64F8.vdex-token?chain=testnet');
console.log('\n');
