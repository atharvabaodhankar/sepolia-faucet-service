import { ethers } from 'ethers';

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';
const PRIVATE_KEY_RAW = process.env.PRIVATE_KEY;
const PRIVATE_KEY = PRIVATE_KEY_RAW ? (PRIVATE_KEY_RAW.startsWith('0x') ? PRIVATE_KEY_RAW : '0x' + PRIVATE_KEY_RAW) : null;
const FAUCET_AMOUNT = process.env.FAUCET_AMOUNT || '0.005';
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || '*';

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
        error: 'Faucet not configured',
        configured: false
      });
    }

    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
    const faucetWallet = new ethers.Wallet(PRIVATE_KEY, provider);

    const balance = await provider.getBalance(faucetWallet.address);
    const balanceETH = ethers.formatEther(balance);

    const amountPerRequest = ethers.parseEther(FAUCET_AMOUNT);
    const requestsRemaining = Math.floor(Number(balance) / Number(amountPerRequest));

    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();

    const minimumBalance = ethers.parseEther('0.1');
    const isLowBalance = balance < minimumBalance;

    return res.status(200).json({
      configured: true,
      faucet: {
        address: faucetWallet.address,
        balance: balanceETH,
        balanceWei: balance.toString(),
        isLowBalance,
        minimumBalance: '0.1'
      },
      settings: {
        amountPerRequest: FAUCET_AMOUNT,
        rateLimitHours: 24,
        masterPasswordEnabled: !!process.env.MASTER_PASSWORD
      },
      capacity: {
        requestsRemaining,
        estimatedDaysRemaining: Math.floor(requestsRemaining / 100)
      },
      network: {
        name: network.name,
        chainId: network.chainId.toString(),
        blockNumber
      },
      status: isLowBalance ? 'warning' : 'healthy',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Faucet status error:', error);
    
    return res.status(500).json({ 
      error: 'Failed to get faucet status',
      configured: false,
      details: error.message
    });
  }
}
