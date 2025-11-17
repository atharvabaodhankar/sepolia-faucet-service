# 📮 Postman Quick Start

## 🚀 Setup (2 Minutes)

### 1. Import Files

Drag these 3 files into Postman:
- ✅ `Sepolia-Faucet.postman_collection.json`
- ✅ `Postman-Environment-Local.json`
- ✅ `Postman-Environment-Production.json`

### 2. Start Local Server

```bash
vercel dev
```

Server runs at: `http://localhost:3000`

### 3. Select Environment

Top right dropdown → **"Sepolia Faucet - Local"**

---

## 🧪 Quick Tests

### Test 1: Health Check ✅

```
GET http://localhost:3000/api/health
```

**Expected:**
```json
{ "status": "healthy" }
```

### Test 2: Get Status 📊

```
GET http://localhost:3000/api/status
```

**Expected:**
```json
{
  "faucet": {
    "address": "0xF5CaF845421A21D2326f3bA04Fb99eD0F75B8465",
    "balance": "2.03"
  },
  "status": "healthy"
}
```

### Test 3: Request ETH 💰

```
POST http://localhost:3000/api/faucet
Content-Type: application/json

{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "masterPassword": "dev-testing-secure-2025"
}
```

**Expected:**
```json
{
  "success": true,
  "transactionHash": "0x...",
  "amount": "0.005",
  "mode": "testing"
}
```

---

## 📡 All Endpoints

| Request | Method | Endpoint | Purpose |
|---------|--------|----------|---------|
| Health Check | GET | `/api/health` | Service status |
| Get Status | GET | `/api/status` | Faucet info |
| Request ETH | POST | `/api/faucet` | Send test ETH |

---

## 🔐 Two Modes

### Testing Mode (Fast)
```json
{
  "address": "0x...",
  "masterPassword": "dev-testing-secure-2024"
}
```
- ✅ No rate limits
- ✅ No signature needed
- ✅ Perfect for testing

### Production Mode (Secure)
```json
{
  "address": "0x...",
  "signature": "0x...",
  "message": "Faucet Request\n..."
}
```
- ✅ Wallet signature required
- ✅ 24-hour rate limit
- ✅ Production-ready

---

## 🎯 Environment Variables

### Local
- `baseUrl`: `http://localhost:3000`
- `masterPassword`: `dev-testing-secure-2025`
- `testAddress`: `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb`

### Production
- `baseUrl`: `https://your-faucet.vercel.app`
- `masterPassword`: `dev-testing-secure-2025`
- `testAddress`: `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb`

**Update baseUrl after deployment!**

---

## 🐛 Common Issues

### "Cannot connect"
→ Run `vercel dev` first

### "Faucet not configured"
→ Check `.env` file exists

### "Invalid address"
→ Use valid Ethereum address (0x...)

### "Rate limit exceeded"
→ Use master password OR wait 24h

---

## 💡 Pro Tips

1. **Save Responses** - Click "Save Response" for examples
2. **Use Variables** - `{{baseUrl}}` works everywhere
3. **Collection Runner** - Test all at once
4. **Tests Tab** - Add automated checks

---

## 📚 Full Documentation

For detailed guide, see: **POSTMAN-GUIDE.md**

---

## ✅ Quick Checklist

- [ ] Import collection
- [ ] Import environments
- [ ] Start `vercel dev`
- [ ] Select "Local" environment
- [ ] Run "Health Check"
- [ ] Run "Get Status"
- [ ] Run "Request ETH"
- [ ] Check transaction on Etherscan

---

**Ready to test!** 🚀

Run "Health Check" first to verify everything works!
