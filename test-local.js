import { ethers } from 'ethers';
import 'dotenv/config';

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

async function testFaucetSetup() {
  console.log('🧪 Testing Faucet Configuration...\n');

  // Test 1: Check environment variables
  console.log('1️⃣ Checking environment variables...');
  if (!SEPOLIA_RPC_URL) {
    console.log('❌ SEPOLIA_RPC_URL not set');
    return;
  }
  console.log('✅ SEPOLIA_RPC_URL:', SEPOLIA_RPC_URL.substring(0, 40) + '...');

  if (!PRIVATE_KEY) {
    console.log('❌ PRIVATE_KEY not set');
    return;
  }
  console.log('✅ PRIVATE_KEY: Set (hidden for security)');

  // Test 2: Connect to provider
  console.log('\n2️⃣ Connecting to Sepolia network...');
  try {
    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
    const network = await provider.getNetwork();
    console.log('✅ Connected to network:', network.name);
    console.log('✅ Chain ID:', network.chainId.toString());

    const blockNumber = await provider.getBlockNumber();
    console.log('✅ Current block:', blockNumber);
  } catch (error) {
    console.log('❌ Failed to connect:', error.message);
    return;
  }

  // Test 3: Check wallet
  console.log('\n3️⃣ Checking faucet wallet...');
  try {
    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
    const privateKey = PRIVATE_KEY.startsWith('0x') ? PRIVATE_KEY : '0x' + PRIVATE_KEY;
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log('✅ Faucet address:', wallet.address);

    const balance = await provider.getBalance(wallet.address);
    const balanceETH = ethers.formatEther(balance);
    console.log('✅ Faucet balance:', balanceETH, 'ETH');

    const faucetAmount = ethers.parseEther(process.env.FAUCET_AMOUNT || '0.005');
    const requestsRemaining = Math.floor(Number(balance) / Number(faucetAmount));
    console.log('✅ Requests remaining:', requestsRemaining);

    if (balance < faucetAmount) {
      console.log('⚠️  WARNING: Insufficient balance for even one request!');
      console.log('   Please fund the faucet wallet with Sepolia ETH');
    } else if (balance < ethers.parseEther('0.1')) {
      console.log('⚠️  WARNING: Balance is low. Consider refilling soon.');
    }
  } catch (error) {
    console.log('❌ Failed to check wallet:', error.message);
    return;
  }

  // Test 4: Check master password
  console.log('\n4️⃣ Checking master password...');
  if (process.env.MASTER_PASSWORD) {
    console.log('✅ Master password is set (length:', process.env.MASTER_PASSWORD.length, 'characters)');
    if (process.env.MASTER_PASSWORD.length < 16) {
      console.log('⚠️  WARNING: Master password is short. Consider using a longer password.');
    }
  } else {
    console.log('⚠️  Master password not set (testing mode disabled)');
  }

  console.log('\n✅ All checks passed! Faucet is ready to deploy.');
  console.log('\n📝 Next steps:');
  console.log('   1. Run: vercel');
  console.log('   2. Add environment variables to Vercel dashboard');
  console.log('   3. Run: vercel --prod');
  console.log('   4. Test your deployed faucet!');
}

testFaucetSetup().catch(console.error);
