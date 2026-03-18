import { ethers } from 'ethers';

// Environment variables
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';
const POLYGON_AMOY_RPC_URL = process.env.POLYGON_AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology';
const PRIVATE_KEY_RAW = process.env.PRIVATE_KEY;
const PRIVATE_KEY = PRIVATE_KEY_RAW ? (PRIVATE_KEY_RAW.startsWith('0x') ? PRIVATE_KEY_RAW : '0x' + PRIVATE_KEY_RAW) : null;
const SEPOLIA_FAUCET_AMOUNT = process.env.SEPOLIA_FAUCET_AMOUNT || '0.005';
const POLYGON_FAUCET_AMOUNT = process.env.POLYGON_FAUCET_AMOUNT || '0.1';
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

export default async function handler(req, res) {
  // CORS headers
  const origin = req.headers.origin;
  const allowedOriginsList = ALLOWED_ORIGINS.split(',').map(o => o.trim());
  
  if (allowedOriginsList.includes('*') || allowedOriginsList.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!PRIVATE_KEY) {
      return res.status(500).json({
        configured: false,
        error: 'Faucet not configured - PRIVATE_KEY missing'
      });
    }

    const networkStatus = {};
    let overallStatus = 'healthy';

    // Check status for each network
    for (const [networkKey, networkConfig] of Object.entries(NETWORKS)) {
      try {
        const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
        const faucetWallet = new ethers.Wallet(PRIVATE_KEY, provider);
        
        // Get faucet balance
        const balance = await provider.getBalance(faucetWallet.address);
        const balanceFormatted = ethers.formatEther(balance);
        const faucetAmount = parseFloat(networkConfig.faucetAmount);
        const requestsRemaining = Math.floor(parseFloat(balanceFormatted) / faucetAmount);

        // Check network connectivity
        const blockNumber = await provider.getBlockNumber();
        
        networkStatus[networkKey] = {
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
        };

        // Update overall status
        if (networkStatus[networkKey].status === 'empty') {
          overallStatus = 'degraded';
        } else if (networkStatus[networkKey].status === 'low' && overallStatus === 'healthy') {
          overallStatus = 'warning';
        }

      } catch (error) {
        console.error(`Error checking ${networkConfig.name} status:`, error);
        networkStatus[networkKey] = {
          name: networkConfig.name,
          currency: networkConfig.currency,
          chainId: networkConfig.chainId,
          error: error.message,
          status: 'error'
        };
        overallStatus = 'degraded';
      }
    }

    return res.status(200).json({
      configured: true,
      timestamp: new Date().toISOString(),
      networks: networkStatus,
      overallStatus: overallStatus,
      supportedNetworks: Object.keys(NETWORKS),
      rateLimit: {
        hours: 24,
        perNetwork: true
      }
    });

  } catch (error) {
    console.error('Status check error:', error);
    return res.status(500).json({
      configured: false,
      error: 'Failed to check faucet status',
      details: error.message
    });
  }
}