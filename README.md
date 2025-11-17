# 🚰 Sepolia Faucet Service

Simple and powerful Sepolia ETH faucet service. Deploy once, use everywhere!

## ✨ Features

- ✅ **Simple**: Just send an address, get test ETH
- ✅ **Smart**: Checks balance before sending (only sends if < 0.001 ETH)
- ✅ **Rate Limited**: 24-hour cooldown per address
- ✅ **Admin Mode**: Master password bypasses all checks for testing
- ✅ **CORS Enabled**: Works from any domain
- ✅ **Production Ready**: Comprehensive error handling

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your values:

```env
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_API_KEY
PRIVATE_KEY=your_faucet_wallet_private_key
FAUCET_AMOUNT=0.005
MASTER_PASSWORD=your-secret-password
ALLOWED_ORIGINS=*
```

### 3. Test Locally

```bash
npm test
vercel dev
```

### 4. Deploy to Vercel

```bash
vercel --prod
```

Add environment variables in Vercel Dashboard → Settings → Environment Variables

---

## 📡 API Endpoints

### POST /api/faucet

Send Sepolia ETH to an address.

#### Normal Mode (For Users)

**Request:**
```json
{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
}
```

**Features:**
- Checks if address has balance (< 0.001 ETH)
- Rate limited (24 hours per address)
- Only sends if user needs ETH

**Response:**
```json
{
  "success": true,
  "transactionHash": "0x...",
  "amount": "0.005",
  "recipient": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "message": "Successfully sent 0.005 ETH to 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "explorerUrl": "https://sepolia.etherscan.io/tx/0x...",
  "mode": "normal"
}
```

#### Admin Mode (For Testing)

**Request:**
```json
{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "masterPassword": "your-secret-password"
}
```

**Features:**
- Bypasses balance check
- Bypasses rate limit
- Sends ETH even if address has balance
- Perfect for testing and development

**Response:**
```json
{
  "success": true,
  "transactionHash": "0x...",
  "amount": "0.005",
  "recipient": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "message": "Successfully sent 0.005 ETH to 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "explorerUrl": "https://sepolia.etherscan.io/tx/0x...",
  "mode": "admin"
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
    "balance": "2.03",
    "isLowBalance": false
  },
  "settings": {
    "amountPerRequest": "0.005",
    "rateLimitHours": 24
  },
  "capacity": {
    "requestsRemaining": 406
  },
  "status": "healthy"
}
```

### GET /api/health

Simple health check.

**Response:**
```json
{
  "status": "healthy",
  "service": "Sepolia Faucet Service",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## 🧪 Testing

### cURL Examples

**Normal Mode:**
```bash
curl -X POST http://localhost:3000/api/faucet \
  -H "Content-Type: application/json" \
  -d '{"address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"}'
```

**Admin Mode:**
```bash
curl -X POST http://localhost:3000/api/faucet \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "masterPassword": "your-secret-password"
  }'
```

**Check Status:**
```bash
curl http://localhost:3000/api/status
```

### Postman Collection

Import `Sepolia-Faucet.postman_collection.json` into Postman for easy testing.

**Quick Guide:** See [POSTMAN-QUICK-START.md](./POSTMAN-QUICK-START.md)

---

## 🔌 Integration Examples

### JavaScript/Fetch

```javascript
// Normal Mode
async function requestTestETH(address) {
  const response = await fetch('https://sepolia-faucet-service.vercel.app/api/faucet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address })
  });
  
  return await response.json();
}

// Admin Mode (for testing)
async function requestTestETHAdmin(address) {
  const response = await fetch('https://sepolia-faucet-service.vercel.app/api/faucet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      address,
      masterPassword: 'your-secret-password'
    })
  });
  
  return await response.json();
}
```

### React Hook

```javascript
import { useState } from 'react';

export function useFaucet(apiUrl) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const requestETH = async (address) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/api/faucet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address })
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

// Usage
const { requestETH, loading, error } = useFaucet('https://sepolia-faucet-service.vercel.app');
```

### Python

```python
import requests

def request_test_eth(address):
    response = requests.post('https://sepolia-faucet-service.vercel.app/api/faucet', 
        json={'address': address}
    )
    return response.json()

# Admin mode
def request_test_eth_admin(address, master_password):
    response = requests.post('https://sepolia-faucet-service.vercel.app/api/faucet',
        json={
            'address': address,
            'masterPassword': master_password
        }
    )
    return response.json()
```

---

## ⚙️ Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SEPOLIA_RPC_URL` | Yes | - | Infura/Alchemy Sepolia endpoint |
| `PRIVATE_KEY` | Yes | - | Faucet wallet private key |
| `FAUCET_AMOUNT` | No | 0.005 | ETH amount per request |
| `MASTER_PASSWORD` | No | - | Admin password (bypasses checks) |
| `ALLOWED_ORIGINS` | No | * | CORS allowed origins |

---

## 🔐 Security

### Normal Mode Protection
- ✅ Balance check (only sends if < 0.001 ETH)
- ✅ Rate limiting (24 hours per address)
- ✅ Prevents abuse

### Master Password
- ⚠️ **Keep it secret!**
- ⚠️ Only use for testing/admin
- ⚠️ Don't expose in client code
- ⚠️ Store in environment variables only

### Best Practices
1. Use dedicated wallet for faucet only
2. Keep limited funds (1-2 ETH max)
3. Monitor balance regularly
4. Rotate master password periodically
5. Never commit `.env` to git

---

## ⚠️ Error Responses

### Rate Limit Exceeded
```json
{
  "error": "Rate limit exceeded. Try again in 12 hours.",
  "nextRequestTime": 1705318200000
}
```

### Already Has Balance
```json
{
  "error": "Address already has sufficient balance",
  "currentBalance": "0.05",
  "message": "This address already has enough ETH. Faucet is for addresses with low balance only."
}
```

### Invalid Address
```json
{
  "error": "Invalid Ethereum address"
}
```

### Faucet Empty
```json
{
  "error": "Faucet is empty. Please try again later.",
  "faucetBalance": "0.001"
}
```

---

## 📊 Monitoring

### Check Faucet Status

```bash
curl https://sepolia-faucet-service.vercel.app/api/status
```

### Monitor Balance

```javascript
setInterval(async () => {
  const response = await fetch('https://sepolia-faucet-service.vercel.app/api/status');
  const data = await response.json();
  
  if (data.faucet.isLowBalance) {
    console.log('⚠️ Faucet balance low! Refill needed.');
  }
}, 3600000); // Every hour
```

---

## 🐛 Troubleshooting

### "Faucet not configured"
→ Check environment variables in Vercel dashboard

### "Rate limit exceeded"
→ Wait 24 hours OR use master password for testing

### "Address already has sufficient balance"
→ User has > 0.001 ETH already OR use master password to bypass

### "Faucet is empty"
→ Refill wallet from https://sepoliafaucet.com/

---

## 💰 Cost Estimation

**Free Tier (Sufficient for most use cases):**
- Vercel: 100GB bandwidth/month
- Infura: 100k requests/day
- Estimated: ~1000 users/month

**Total Cost:** $0/month + Free Sepolia ETH

---

## 🎯 Use Cases

- DApp onboarding (auto-fund new users)
- Testing environments (quick ETH for developers)
- Educational projects (students learning Web3)
- Hackathons (participants need test ETH)
- Multiple projects (one faucet for all apps)

---

## 📝 License

MIT

---

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.

---

**Built with ❤️ for the Web3 community**

**Deploy once, use everywhere!** 🚀
