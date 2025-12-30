import { vdexToken_getTotalSupply, vdexToken_getBalance, DEPLOYER_ADDRESS, callReadOnly } from './interact-contracts.ts';

console.log('🔍 Checking VDEX Token Status...\n');

console.log('Current Supply:');
await vdexToken_getTotalSupply();

console.log('\nYour Balance:');
await vdexToken_getBalance(DEPLOYER_ADDRESS);

console.log('\nChecking if initialized:');
try {
  const result = await callReadOnly('vdex-token', 'get-is-initialized');
  console.log('Initialized:', result);
} catch (e) {
  console.log('Could not check initialization status');
}

console.log('\n💡 If total supply is 0, run the INITIALIZE function!');
console.log('If total supply is > 0, it has already been initialized.\n');
