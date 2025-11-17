# 🚰 Sepolia Faucet Service

Standalone Sepolia ETH faucet service for Web3 projects. Deploy once, use everywhere!

## ✨ Features

- ✅ **Dual Authentication**: Wallet signature verification + master password for testing
- ✅ **Rate Limiting**: 24-hour cooldown per address (bypassed with master password)
- ✅ **Balance Checking**: Only sends to addresses with < 0.001 ETH (bypassed with master password)
- ✅ **CORS Enabled**: Works from any domain
- ✅ **Production Ready**: Comprehensive error handling and logging
- ✅ **Testing Mode**: Master password bypasses all limits for development

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```env
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_API_KEY
PRIVATE_KEY=your_faucet_wallet_private_key
FAUCET_AMOUNT=0.005
MASTER_PASSWORD=your-secret-testing-password
ALLOWED_ORIGINS=*
```

### 3. Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Add environment variables in Vercel dashboard
# Then redeploy for production
vercel --prod
```

## 📡 API Endpoints

### POST /api/faucet

Send Sepolia ETH to users.

**Regular Request (Production):**
```json
{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "signature": "0x...",
  "message": "Faucet Request\nAddress: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb\nTimestamp: 1234567890"
}
```

**Testing Request (Master Password):**
```json
{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "masterPassword": "your-secret-testing-password"
}
```

**Response:**
```json
{
  "success": true,
  "transactionHash": "0x...",
  "amount": "0.005",
  "recipient": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "message": "Successfully sent 0.005 ETH to 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "explorerUrl": "https://sepolia.etherscan.io/tx/0x...",
  "mode": "testing"
}
```

### GET /api/status

Check faucet balance and health.

**Response:**
```json
{
  "configured": true,
  "faucet": {
    "address": "0xF5CaF845421A21D2326f3bA04Fb99eD0F75B8465",
    "balance": "2.08",
    "isLowBalance": false
  },
  "settings": {
    "amountPerRequest": "0.005",
    "rateLimitHours": 24,
    "masterPasswordEnabled": true
  },
  "capacity": {
    "requestsRemaining": 416
  },
  "status": "healthy"
}
```

### GET /api/health

Simple health check endpoint.

## 🔌 Integration Examples

### JavaScript/TypeScript (Regular Users)

```javascript
const FAUCET_URL = 'https://your-faucet.vercel.app';

async function requestTestETH(userAddress, signer) {
  // Create message
  const message = `Faucet Request\nAddress: ${userAddress}\nTimestamp: ${Date.now()}`;
  
  // Sign with user's wallet
  const signature = await signer.signMessage(message);
  
  // Request funds
  const response = await fetch(`${FAUCET_URL}/api/faucet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      address: userAddress, 
      signature, 
      message 
    })
  });
  
  const data = await response.json();
  
  if (data.success) {
    console.log('✅ Received test ETH!', data.transactionHash);
  } else {
    console.error('❌ Faucet request failed:', data.error);
  }
  
  return data;
}
```

### Testing/Development (Master Password)

```javascript
const FAUCET_URL = 'https://your-faucet.vercel.app';
const MASTER_PASSWORD = 'your-secret-password'; // Store securely!

async function requestTestETHAdmin(userAddress) {
  const response = await fetch(`${FAUCET_URL}/api/faucet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      address: userAddress,
      masterPassword: MASTER_PASSWORD  // Bypasses all checks
    })
  });
  
  return await response.json();
}

// Usage - can call multiple times without rate limits
await requestTestETHAdmin('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb');
```

### React Hook

```javascript
import { useState } from 'react';

export function useFaucet(apiUrl) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const requestETH = async (address, signer) => {
    setLoading(true);
    setError(null);
    
    try {
      const message = `Faucet Request\nAddress: ${address}\nTimestamp: ${Date.now()}`;
      const signature = await signer.signMessage(message);
      
      const response = await fetch(`${apiUrl}/api/faucet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, signature, message })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Faucet request failed');
      }
      
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  return { requestETH, loading, error };
}

// Usage in component:
// const { requestETH, loading } = useFaucet('https://your-faucet.vercel.app');
// await requestETH(userAddress, signer);
```

### cURL Testing

```bash
# Test with master password (bypasses all limits)
curl -X POST https://your-faucet.vercel.app/api/faucet \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "masterPassword": "your-secret-password"
  }'

# Check faucet status
curl https://your-faucet.vercel.app/api/status
```

## 🔐 Security

### Master Password Best Practices

⚠️ **CRITICAL**: The master password bypasses ALL security checks!

**DO:**
- ✅ Use a strong, random password (32+ characters)
- ✅ Store in environment variables only
- ✅ Never commit to git
- ✅ Only use for testing/development
- ✅ Rotate regularly

**DON'T:**
- ❌ Use simple passwords
- ❌ Share with anyone
- ❌ Hardcode in client applications
- ❌ Use in production client code

### Generate Strong Password

```bash
# Generate a strong password
openssl rand -base64 32
```

### Production Security

1. **Dedicated Wallet**: Use a separate wallet ONLY for the faucet
2. **Limited Funds**: Keep only 1-2 ETH in the faucet wallet
3. **Monitor Balance**: Check `/api/status` regularly
4. **Rate Limiting**: Built-in 24-hour cooldown per address
5. **Signature Verification**: Prevents unauthorized requests

## 📊 Monitoring

### Check Faucet Status

```bash
curl https://your-faucet.vercel.app/api/status
```

### Monitoring Script

```javascript
// monitor.js
setInterval(async () => {
  const response = await fetch('https://your-faucet.vercel.app/api/status');
  const data = await response.json();
  
  if (data.faucet.isLowBalance) {
    console.log('⚠️ Faucet balance low! Refill needed.');
    // Send alert (email, Slack, etc.)
  }
  
  console.log(`Balance: ${data.faucet.balance} ETH | Requests remaining: ${data.capacity.requestsRemaining}`);
}, 3600000); // Check every hour
```

## 🎯 Use Cases

This faucet service can be integrated into:

1. **DApp Onboarding** - Auto-fund new users
2. **Testing Environments** - Quick ETH for developers
3. **Educational Projects** - Students learning Web3
4. **Hackathons** - Participants need test ETH
5. **Multiple Projects** - One faucet for all your apps

## 💰 Cost Estimation

### Vercel (Free Tier)
- ✅ 100GB bandwidth/month
- ✅ 100 serverless function executions/day
- ✅ Sufficient for ~1000 users/month

### Infura (Free Tier)
- ✅ 100k requests/day
- ✅ More than enough for faucet operations

### Faucet Wallet
- 💰 1 ETH = 200 users (0.005 ETH each)
- 💰 Refill monthly or as needed

**Total Cost**: $0/month (free tiers) + Sepolia ETH (free from public faucets)

## 🔧 Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SEPOLIA_RPC_URL` | Yes | - | Infura/Alchemy Sepolia endpoint |
| `PRIVATE_KEY` | Yes | - | Faucet wallet private key |
| `FAUCET_AMOUNT` | No | 0.005 | ETH amount per request |
| `MASTER_PASSWORD` | No | - | Testing bypass password |
| `ALLOWED_ORIGINS` | No | * | CORS allowed origins |

## 🐛 Troubleshooting

### "Faucet not configured"
- Check that `PRIVATE_KEY` is set in environment variables
- Ensure private key is valid (with or without 0x prefix)

### "Rate limit exceeded"
- Wait 24 hours or use master password for testing
- Check `/api/status` for next request time

### "Address already has sufficient balance"
- User has > 0.001 ETH already
- Use master password to bypass this check

### "Faucet is empty"
- Refill the faucet wallet with Sepolia ETH
- Check balance at `/api/status`

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.

## 📧 Support

For issues or questions, please open a GitHub issue.

---

**Built with ❤️ for the Web3 community**
