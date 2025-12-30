import { testToken_getBalance, testToken_getTotalSupply, DEPLOYER_ADDRESS } from './interact-contracts.ts';

console.log('🔍 Checking if mint transaction succeeded...\n');
await testToken_getTotalSupply();
await testToken_getBalance(DEPLOYER_ADDRESS);

console.log('\n💡 If balance is still 0, the transaction might be:');
console.log('  1. Still pending (wait a few minutes)');
console.log('  2. Failed (check transaction on explorer)');
console.log('  3. Not yet broadcast (try again in wallet)\n');
