import { ethers } from 'ethers';

// Environment variables
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';
const POLYGON_AMOY_RPC_URL = process.env.POLYGON_AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology';
const PRIVATE_KEY_RAW = process.env.PRIVATE_KEY;
const PRIVATE_KEY = PRIVATE_KEY_RAW ? (PRIVATE_KEY_RAW.startsWith('0x') ? PRIVATE_KEY_RAW : '0x' + PRIVATE_KEY_RAW) : null;
const SEPOLIA_FAUCET_AMOUNT = process.env.SEPOLIA_FAUCET_AMOUNT || '0.005';
const POLYGON_FAUCET_AMOUNT = process.env.POLYGON_FAUCET_AMOUNT || '0.5';
const MASTER_PASSWORD = process.env.MASTER_PASSWORD;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || '*';
const RATE_LIMIT_HOURS = 24;

// Network configurations
const NETWORKS = {
  sepolia: {
    name: 'Sepolia',
    rpcUrl: SEPOLIA_RPC_URL,
    chainId: 11155111,
    faucetAmount: SEPOLIA_FAUCET_AMOUNT,
    currency: 'ETH',
    explorerUrl: 'https://sepolia.etherscan.io/tx/',
    minimumBalance: '0.001'
  },
  polygon: {
    name: 'Polygon Amoy',
    rpcUrl: POLYGON_AMOY_RPC_URL,
    chainId: 80002,
    faucetAmount: POLYGON_FAUCET_AMOUNT,
    currency: 'POL',
    explorerUrl: 'https://amoy.polygonscan.com/tx/',
    minimumBalance: '0.01'
  }
};

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
    const { address, masterPassword, network = 'sepolia' } = req.body;

    // Validate network
    if (!NETWORKS[network]) {
      return res.status(400).json({ 
        error: 'Invalid network',
        supportedNetworks: Object.keys(NETWORKS)
      });
    }

    const networkConfig = NETWORKS[network];

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
      provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
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
      // Normal mode - check rate limiting (per network)
      const now = Date.now();
      const rateLimitKey = `${address.toLowerCase()}_${network}`;
      const lastRequest = requestHistory.get(rateLimitKey);
      
      if (lastRequest && (now - lastRequest) < (RATE_LIMIT_HOURS * 60 * 60 * 1000)) {
        const hoursLeft = Math.ceil((RATE_LIMIT_HOURS * 60 * 60 * 1000 - (now - lastRequest)) / (60 * 60 * 1000));
        return res.status(429).json({ 
          error: `Rate limit exceeded for ${networkConfig.name}. Try again in ${hoursLeft} hours.`,
          nextRequestTime: lastRequest + (RATE_LIMIT_HOURS * 60 * 60 * 1000),
          network: networkConfig.name
        });
      }

      // Check recipient balance
      const recipientBalance = await provider.getBalance(address);
      const minimumBalance = ethers.parseEther(networkConfig.minimumBalance);

      if (recipientBalance > minimumBalance) {
        return res.status(400).json({ 
          error: `Address already has sufficient balance on ${networkConfig.name}`,
          currentBalance: ethers.formatEther(recipientBalance),
          currency: networkConfig.currency,
          message: `This address already has enough ${networkConfig.currency}. Faucet is for addresses with low balance only.`
        });
      }
    } else {
      console.log(`🔓 Master password used - bypassing balance check and rate limit for: ${address} on ${networkConfig.name}`);
    }

    // Check faucet balance
    const faucetBalance = await faucetWallet.provider.getBalance(faucetWallet.address);
    const amountToSend = ethers.parseEther(networkConfig.faucetAmount);

    if (faucetBalance < amountToSend) {
      return res.status(503).json({ 
        error: `Faucet is empty on ${networkConfig.name}. Please try again later.`,
        faucetBalance: ethers.formatEther(faucetBalance),
        network: networkConfig.name,
        currency: networkConfig.currency
      });
    }

    // Send the transaction
    const tx = await faucetWallet.sendTransaction({
      to: address,
      value: amountToSend,
      gasLimit: network === 'polygon' ? 25000 : 21000, // Higher gas limit for Polygon
    });

    // Update rate limiting (only for normal mode)
    if (!isMasterPasswordMode) {
      const rateLimitKey = `${address.toLowerCase()}_${network}`;
      requestHistory.set(rateLimitKey, Date.now());
    }

    console.log(`✅ Sent ${networkConfig.faucetAmount} ${networkConfig.currency} to ${address} on ${networkConfig.name} | TX: ${tx.hash} | Mode: ${isMasterPasswordMode ? 'MASTER' : 'NORMAL'}`);

    return res.status(200).json({
      success: true,
      transactionHash: tx.hash,
      amount: networkConfig.faucetAmount,
      currency: networkConfig.currency,
      network: networkConfig.name,
      recipient: address,
      message: `Successfully sent ${networkConfig.faucetAmount} ${networkConfig.currency} to ${address} on ${networkConfig.name}`,
      explorerUrl: `${networkConfig.explorerUrl}${tx.hash}`,
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
