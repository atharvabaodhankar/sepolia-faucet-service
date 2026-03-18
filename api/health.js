const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || '*';

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
    return res.status(200).json({
      success: true,
      status: 'healthy',
      service: 'Multi-Network Faucet Service',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      networks: ['sepolia', 'polygon'],
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'production'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}