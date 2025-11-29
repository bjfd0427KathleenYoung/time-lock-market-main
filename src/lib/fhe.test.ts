/**
 * FHE SDK Initialization Test
 * Run this in browser console to verify setup
 */

import { initializeFHE, isFHEReady, getFHEInstance } from './fhe';

/**
 * Test 1: Initialize FHE SDK
 */
export async function testInitialization() {
  console.log('=== Test 1: FHE SDK Initialization ===');

  try {
    console.log('Starting initialization...');
    const instance = await initializeFHE();

    console.log('â
 Initialization successful!');
    console.log('Instance:', instance);
    console.log('Is ready:', isFHEReady());

    return true;
  } catch (error) {
    console.error('â Initialization failed:', error);
    return false;
  }
}

/**
 * Test 2: Create Encrypted Input
 */
export async function testEncryption() {
  console.log('\n=== Test 2: Encryption Test ===');

  try {
    const fhe = await getFHEInstance();

    // Mock addresses (use real ones in production)
    const contractAddr = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0' as `0x${string}`;
    const userAddr = '0x0000000000000000000000000000000000000001';

    console.log('Creating encrypted input...');
    const input = fhe.createEncryptedInput(contractAddr, userAddr);

    console.log('Adding values...');
    input.add64(BigInt(1000));
    input.add32(30);
    input.add32(5);

    console.log('Encrypting...');
    const { handles, inputProof } = await input.encrypt();

    console.log('â
 Encryption successful!');
    console.log('Handles:', handles);
    console.log('Proof length:', inputProof.length);

    return true;
  } catch (error) {
    console.error('â Encryption failed:', error);
    return false;
  }
}

/**
 * Run all tests
 */
export async function runAllTests() {
  console.log('ð§ª Running FHEVM 0.9 Setup Tests...\n');

  const test1 = await testInitialization();
  const test2 = await testEncryption();

  console.log('\n=== Test Results ===');
  console.log('Initialization:', test1 ? 'â
 PASS' : 'â FAIL');
  console.log('Encryption:', test2 ? 'â
 PASS' : 'â FAIL');

  const allPassed = test1 && test2;

  if (allPassed) {
    console.log('\nð All tests passed! FHEVM 0.9 is ready to use.');
  } else {
    console.log('\nâ ï¸ Some tests failed. Check the errors above.');
  }

  return allPassed;
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).fheTests = {
    runAllTests,
    testInitialization,
    testEncryption
  };
}
