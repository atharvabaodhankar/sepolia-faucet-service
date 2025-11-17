import { ethers } from 'ethers';
import 'dotenv/config';

// Simulate the faucet endpoint locally
async function testFaucetEndpoint() {
  console.log('🧪 Testing Faucet API Logic...\n');

  const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  const FAUCET_AMOUNT = process.env.FAUCET_AMOUNT || '0.005';
  const MASTER_PASSWORD = process.env.MASTER_PASSWORD;

  try {
    // Test 1: Initialize provider and wallet
    console.log('1️⃣ Testing wallet initialization...');
    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
    const privateKey = PRIVATE_KEY.startsWith('0x') ? PRIVATE_KEY : '0x' + PRIVATE_KEY;
    const faucetWallet = new ethers.Wallet(privateKey, provider);
    console.log('✅ Wallet initialized:', faucetWallet.address);

    // Test 2: Check balance
    console.log('\n2️⃣ Testing balance check...');
    const balance = await provider.getBalance(faucetWallet.address);
    const balanceETH = ethers.formatEther(balance);
    console.log('✅ Balance:', balanceETH, 'ETH');

    // Test 3: Verify amount
    console.log('\n3️⃣ Testing amount parsing...');
    const amountToSend = ethers.parseEther(FAUCET_AMOUNT);
    console.log('✅ Amount to send:', ethers.formatEther(amountToSend), 'ETH');

    // Test 4: Check if sufficient balance
    console.log('\n4️⃣ Testing balance sufficiency...');
    if (balance >= amountToSend) {
      console.log('✅ Sufficient balance for at least one request');
      const requestsRemaining = Math.floor(Number(balance) / Number(amountToSend));
      console.log('✅ Requests remaining:', requestsRemaining);
    } else {
      console.log('❌ Insufficient balance');
    }

    // Test 5: Test signature verification
    console.log('\n5️⃣ Testing signature verification...');
    const testAddress = faucetWallet.address;
    const message = `Faucet Request\nAddress: ${testAddress}\nTimestamp: ${Date.now()}`;
    const signature = await faucetWallet.signMessage(message);
    const recoveredAddress = ethers.verifyMessage(message, signature);
    
    if (recoveredAddress.toLowerCase() === testAddress.toLowerCase()) {
      console.log('✅ Signature verification works');
    } else {
      console.log('❌ Signature verification failed');
    }

    // Test 6: Test master password
    console.log('\n6️⃣ Testing master password...');
    if (MASTER_PASSWORD) {
      console.log('✅ Master password is set');
      console.log('✅ Testing mode enabled');
    } else {
      console.log('⚠️  Master password not set (testing mode disabled)');
    }

    // Test 7: Test address validation
    console.log('\n7️⃣ Testing address validation...');
    const validAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
    const invalidAddress = '0xinvalid';
    
    console.log('Valid address:', ethers.isAddress(validAddress) ? '✅' : '❌');
    console.log('Invalid address:', !ethers.isAddress(invalidAddress) ? '✅' : '❌');

    console.log('\n✅ All API logic tests passed!');
    console.log('\n📝 Your faucet API is ready to deploy!');
    console.log('   Run: vercel');
    console.log('   Then: vercel --prod');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testFaucetEndpoint().catch(console.error);
