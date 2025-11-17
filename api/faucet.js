import { ethers } from 'ethers';

// Environment variables
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';
const PRIVATE_KEY_RAW = process.env.PRIVATE_KEY;
const PRIVATE_KEY = PRIVATE_KEY_RAW ? (PRIVATE_KEY_RAW.startsWith('0x') ? PRIVATE_KEY_RAW : '0x' + PRIVATE_KEY_RAW) : null;
const FAUCET_AMOUNT = process.env.FAUCET_AMOUNT || '0.005';
const MASTER_PASSWORD = process.env.MASTER_PASSWORD;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || '*';
const RATE_LIMIT_HOURS = 24;

// In-memory rate limiting (use Redis in production for multi-instance)
const requestHistory = new Map();

export default async function handler(req, res) {
  // CORS headers
  const origin = req.headers.origin;
  const allowedOriginsList = ALLOWED_ORIGINS.split(',').map(o => o.trim());
  
  if (allowedOriginsList.includes('*') || allowedOriginsList.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { address, masterPassword } = req.body;

    // Validate address
    if (!address || !ethers.isAddress(address)) {
      return res.status(400).json({ error: 'Invalid Ethereum address' });
    }

    // Check if faucet is configured
    if (!PRIVATE_KEY) {
      return res.status(500).json({ 
        error: 'Faucet not configured',
        debug: 'PRIVATE_KEY environment variable is not set'
      });
    }

    // Initialize provider and wallet
    let provider, faucetWallet;
    try {
      provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
      faucetWallet = new ethers.Wallet(PRIVATE_KEY, provider);
    } catch (walletError) {
      console.error('Wallet initialization error:', walletError);
      return res.status(500).json({ 
        error: 'Failed to initialize faucet wallet',
        details: walletError.message
      });
    }

    // Check if using master password (bypasses balance check and rate limit)
    const isMasterPasswordMode = masterPassword && MASTER_PASSWORD && masterPassword === MASTER_PASSWORD;

    if (!isMasterPasswordMode) {
      // Normal mode - check rate limiting
      const now = Date.now();
      const lastRequest = requestHistory.get(address.toLowerCase());
      
      if (lastRequest && (now - lastRequest) < (RATE_LIMIT_HOURS * 60 * 60 * 1000)) {
        const hoursLeft = Math.ceil((RATE_LIMIT_HOURS * 60 * 60 * 1000 - (now - lastRequest)) / (60 * 60 * 1000));
        return res.status(429).json({ 
          error: `Rate limit exceeded. Try again in ${hoursLeft} hours.`,
          nextRequestTime: lastRequest + (RATE_LIMIT_HOURS * 60 * 60 * 1000)
        });
      }

      // Check recipient balance
      const recipientBalance = await provider.getBalance(address);
      const minimumBalance = ethers.parseEther('0.001');

      if (recipientBalance > minimumBalance) {
        return res.status(400).json({ 
          error: 'Address already has sufficient balance',
          currentBalance: ethers.formatEther(recipientBalance),
          message: 'This address already has enough ETH. Faucet is for addresses with low balance only.'
        });
      }
    } else {
      console.log('🔓 Master password used - bypassing balance check and rate limit for:', address);
    }

    // Check faucet balance
    const faucetBalance = await faucetWallet.provider.getBalance(faucetWallet.address);
    const amountToSend = ethers.parseEther(FAUCET_AMOUNT);

    if (faucetBalance < amountToSend) {
      return res.status(503).json({ 
        error: 'Faucet is empty. Please try again later.',
        faucetBalance: ethers.formatEther(faucetBalance)
      });
    }

    // Send the transaction
    const tx = await faucetWallet.sendTransaction({
      to: address,
      value: amountToSend,
      gasLimit: 21000,
    });

    // Update rate limiting (only for normal mode)
    if (!isMasterPasswordMode) {
      requestHistory.set(address.toLowerCase(), Date.now());
    }

    console.log(`✅ Sent ${FAUCET_AMOUNT} ETH to ${address} | TX: ${tx.hash} | Mode: ${isMasterPasswordMode ? 'MASTER' : 'NORMAL'}`);

    return res.status(200).json({
      success: true,
      transactionHash: tx.hash,
      amount: FAUCET_AMOUNT,
      recipient: address,
      message: `Successfully sent ${FAUCET_AMOUNT} ETH to ${address}`,
      explorerUrl: `https://sepolia.etherscan.io/tx/${tx.hash}`,
      mode: isMasterPasswordMode ? 'admin' : 'normal'
    });

  } catch (error) {
    console.error('Faucet error:', error);
    console.error('Error stack:', error.stack);
    
    // Handle RPC rate limiting
    if (error.message && error.message.includes('in-flight transaction limit')) {
      return res.status(429).json({ 
        error: 'Too many requests. Please try again in a few minutes.',
        details: 'RPC rate limit reached'
      });
    }
    
    if (error.code === 'INSUFFICIENT_FUNDS') {
      return res.status(503).json({ error: 'Faucet has insufficient funds' });
    }
    
    if (error.code === 'NETWORK_ERROR') {
      return res.status(503).json({ error: 'Network error. Please try again later.' });
    }

    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message,
      code: error.code
    });
  }
}
