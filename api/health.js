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

  return res.status(200).json({
    status: 'healthy',
    service: 'Sepolia Faucet Service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
}
