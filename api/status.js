import { ethers } from 'ethers';

// Environment variables
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';
const POLYGON_AMOY_RPC_URL = process.env.POLYGON_AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology';
const PRIVATE_KEY_RAW = process.env.PRIVATE_KEY;
const PRIVATE_KEY = PRIVATE_KEY_RAW ? (PRIVATE_KEY_RAW.startsWith('0x') ? PRIVATE_KEY_RAW : '0x' + PRIVATE_KEY_RAW) : null;
const SEPOLIA_FAUCET_AMOUNT = process.env.SEPOLIA_FAUCET_AMOUNT || '0.005';
const POLYGON_FAUCET_AMOUNT = process.env.POLYGON_FAUCET_AMOUNT || '0.5';
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || '*';

// Network configurations
const NETWORKS = {
  sepolia: {
    name: 'Sepolia',
    rpcUrl: SEPOLIA_RPC_URL,
    chainId: 11155111,
    faucetAmount: SEPOLIA_FAUCET_AMOUNT,
    currency: 'ETH',
    explorerUrl: 'https://sepolia.etherscan.io/address/'
  },
  polygon: {
    name: 'Polygon Amoy',
    rpcUrl: POLYGON_AMOY_RPC_URL,
    chainId: 80002,
    faucetAmount: POLYGON_FAUCET_AMOUNT,
    currency: 'POL',
    explorerUrl: 'https://amoy.polygonscan.com/address/'
  }
};

// Helper function to check network with timeout
async function checkNetworkWithTimeout(networkKey, networkConfig, privateKey, timeoutMs = 10000) {
  return new Promise(async (resolve) => {
    const timeout = setTimeout(() => {
      resolve({
        name: networkConfig.name,
        currency: networkConfig.currency,
        chainId: networkConfig.chainId,
        error: 'Request timeout',
        status: 'timeout'
      });
    }, timeoutMs);

    try {
      const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
      const faucetWallet = new ethers.Wallet(privateKey, provider);
      
      // Get faucet balance with timeout
      const balance = await provider.getBalance(faucetWallet.address);
      const balanceFormatted = ethers.formatEther(balance);
      const faucetAmount = parseFloat(networkConfig.faucetAmount);
      const requestsRemaining = Math.floor(parseFloat(balanceFormatted) / faucetAmount);

      // Get block number to verify connectivity
      const blockNumber = await provider.getBlockNumber();
      
      clearTimeout(timeout);
      resolve({
        name: networkConfig.name,
        currency: networkConfig.currency,
        chainId: networkConfig.chainId,
        faucet: {
          address: faucetWallet.address,
          balance: balanceFormatted,
          currency: networkConfig.currency
        },
        capacity: {
          amountPerRequest: networkConfig.faucetAmount,
          requestsRemaining: requestsRemaining
        },
        network: {
          blockNumber: blockNumber,
          connected: true
        },
        explorerUrl: `${networkConfig.explorerUrl}${faucetWallet.address}`,
        status: requestsRemaining > 10 ? 'healthy' : requestsRemaining > 0 ? 'low' : 'empty'
      });

    } catch (error) {
      clearTimeout(timeout);
      console.error(`Error checking ${networkConfig.name} status:`, error.message);
      resolve({
        name: networkConfig.name,
        currency: networkConfig.currency,
        chainId: networkConfig.chainId,
        error: error.message,
        status: 'error'
      });
    }
  });
}

export default async function handler(req, res) {
  // Set CORS headers first
  const origin = req.headers.origin;
  const allowedOriginsList = ALLOWED_ORIGINS.split(',').map(o => o.trim());
  
  if (allowedOriginsList.includes('*') || allowedOriginsList.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed',
      allowedMethods: ['GET', 'OPTIONS']
    });
  }

  try {
    // Check if private key is configured
    if (!PRIVATE_KEY) {
      return res.status(500).json({
        success: false,
        configured: false,
        error: 'Faucet not configured - PRIVATE_KEY missing',
        timestamp: new Date().toISOString()
      });
    }

    // Check all networks in parallel with timeout
    const networkChecks = Object.entries(NETWORKS).map(([networkKey, networkConfig]) =>
      checkNetworkWithTimeout(networkKey, networkConfig, PRIVATE_KEY, 8000)
    );

    const networkResults = await Promise.all(networkChecks);
    
    // Build network status object
    const networkStatus = {};
    let overallStatus = 'healthy';
    
    Object.keys(NETWORKS).forEach((networkKey, index) => {
      networkStatus[networkKey] = networkResults[index];
      
      // Update overall status
      if (networkResults[index].status === 'error' || networkResults[index].status === 'timeout') {
        overallStatus = 'degraded';
      } else if (networkResults[index].status === 'empty') {
        overallStatus = 'degraded';
      } else if (networkResults[index].status === 'low' && overallStatus === 'healthy') {
        overallStatus = 'warning';
      }
    });

    // Return successful response
    return res.status(200).json({
      success: true,
      configured: true,
      timestamp: new Date().toISOString(),
      networks: networkStatus,
      overallStatus: overallStatus,
      supportedNetworks: Object.keys(NETWORKS),
      rateLimit: {
        hours: 24,
        perNetwork: true
      },
      version: '2.0.0'
    });

  } catch (error) {
    console.error('Status check error:', error);
    return res.status(500).json({
      success: false,
      configured: false,
      error: 'Failed to check faucet status',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}