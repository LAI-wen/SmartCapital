# Backend API Testing Guide

Backend server is running on **port 3002**

## ✅ Account Management APIs

### 1. Get User Accounts
```bash
curl http://localhost:3002/api/accounts/Ue9339b8a1d6ad32bd10fe0a5e1d8f8b6
```

### 2. Create New Account
```bash
# Create 錢包 (Cash)
curl -X POST http://localhost:3002/api/accounts/Ue9339b8a1d6ad32bd10fe0a5e1d8f8b6 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "錢包",
    "type": "CASH",
    "currency": "TWD",
    "balance": 10000,
    "isDefault": true
  }'

# Create 台新銀行 (Bank)
curl -X POST http://localhost:3002/api/accounts/Ue9339b8a1d6ad32bd10fe0a5e1d8f8b6 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "台新銀行",
    "type": "BANK",
    "currency": "TWD",
    "balance": 50000
  }'

# Create 複委託證券戶 (Sub-brokerage)
curl -X POST http://localhost:3002/api/accounts/Ue9339b8a1d6ad32bd10fe0a5e1d8f8b6 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "國泰證券 (複委託)",
    "type": "BROKERAGE",
    "currency": "TWD",
    "balance": 200000,
    "isSub": true
  }'

# Create Firstrade (USD Brokerage)
curl -X POST http://localhost:3002/api/accounts/Ue9339b8a1d6ad32bd10fe0a5e1d8f8b6 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Firstrade",
    "type": "BROKERAGE",
    "currency": "USD",
    "balance": 5000
  }'
```

### 3. Update Account
```bash
# Update account name
curl -X PATCH http://localhost:3002/api/accounts/[accountId] \
  -H "Content-Type: application/json" \
  -d '{
    "name": "主要銀行 (已更名)"
  }'

# Set as default account
curl -X PATCH http://localhost:3002/api/accounts/[accountId] \
  -H "Content-Type: application/json" \
  -d '{
    "isDefault": true
  }'
```

### 4. Delete Account
```bash
curl -X DELETE http://localhost:3002/api/accounts/[accountId]
```

---

## 💸 Transfer APIs

### 1. Create Transfer Between Accounts
```bash
# Simple transfer (same currency)
curl -X POST http://localhost:3002/api/transfers/Ue9339b8a1d6ad32bd10fe0a5e1d8f8b6 \
  -H "Content-Type: application/json" \
  -d '{
    "fromAccountId": "[cashAccountId]",
    "toAccountId": "[bankAccountId]",
    "amount": 5000,
    "note": "存入銀行"
  }'

# Transfer with exchange rate (TWD to USD sub-brokerage)
curl -X POST http://localhost:3002/api/transfers/Ue9339b8a1d6ad32bd10fe0a5e1d8f8b6 \
  -H "Content-Type: application/json" \
  -d '{
    "fromAccountId": "[bankAccountId]",
    "toAccountId": "[subBrokerageId]",
    "amount": 32500,
    "exchangeRate": 0.03077,
    "fee": 100,
    "note": "複委託買美股"
  }'
```

### 2. Get Transfer History
```bash
curl http://localhost:3002/api/transfers/Ue9339b8a1d6ad32bd10fe0a5e1d8f8b6?limit=20
```

---

## 💰 Transaction APIs (Updated)

### 1. Create Transaction with Account
```bash
# Income transaction
curl -X POST http://localhost:3002/api/transactions/Ue9339b8a1d6ad32bd10fe0a5e1d8f8b6 \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "[accountId]",
    "type": "income",
    "amount": 30000,
    "category": "salary",
    "note": "月薪入帳"
  }'

# Expense transaction
curl -X POST http://localhost:3002/api/transactions/Ue9339b8a1d6ad32bd10fe0a5e1d8f8b6 \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "[accountId]",
    "type": "expense",
    "amount": 150,
    "category": "food",
    "note": "午餐"
  }'

# Transaction without account (backward compatible)
curl -X POST http://localhost:3002/api/transactions/Ue9339b8a1d6ad32bd10fe0a5e1d8f8b6 \
  -H "Content-Type: application/json" \
  -d '{
    "type": "expense",
    "amount": 100,
    "category": "transport",
    "note": "公車"
  }'
```

### 2. Get Transaction History
```bash
curl http://localhost:3002/api/transactions/Ue9339b8a1d6ad32bd10fe0a5e1d8f8b6?limit=50
```

---

## 📊 Complete Integration Test

```bash
# Step 1: Create user accounts
ACCOUNT1=$(curl -s -X POST http://localhost:3002/api/accounts/test_user \
  -H "Content-Type: application/json" \
  -d '{"name":"錢包","type":"CASH","currency":"TWD","balance":10000,"isDefault":true}' \
  | jq -r '.data.id')

ACCOUNT2=$(curl -s -X POST http://localhost:3002/api/accounts/test_user \
  -H "Content-Type: application/json" \
  -d '{"name":"台新銀行","type":"BANK","currency":"TWD","balance":50000}' \
  | jq -r '.data.id')

ACCOUNT3=$(curl -s -X POST http://localhost:3002/api/accounts/test_user \
  -H "Content-Type: application/json" \
  -d '{"name":"國泰證券","type":"BROKERAGE","currency":"TWD","balance":200000,"isSub":true}' \
  | jq -r '.data.id')

echo "Created accounts: $ACCOUNT1, $ACCOUNT2, $ACCOUNT3"

# Step 2: View all accounts
curl http://localhost:3002/api/accounts/test_user | jq

# Step 3: Create income transaction
curl -X POST http://localhost:3002/api/transactions/test_user \
  -H "Content-Type: application/json" \
  -d "{
    \"accountId\": \"$ACCOUNT1\",
    \"type\": \"income\",
    \"amount\": 5000,
    \"category\": \"bonus\",
    \"note\": \"獎金\"
  }" | jq

# Step 4: Transfer between accounts
curl -X POST http://localhost:3002/api/transfers/test_user \
  -H "Content-Type: application/json" \
  -d "{
    \"fromAccountId\": \"$ACCOUNT1\",
    \"toAccountId\": \"$ACCOUNT2\",
    \"amount\": 3000,
    \"note\": \"存入銀行\"
  }" | jq

# Step 5: View account balances
curl http://localhost:3002/api/accounts/test_user | jq '.data[] | {name, balance}'
```

---

## 🎯 Frontend Integration Points

### Update `services/api.ts` to use these endpoints:

```typescript
// Get user accounts
export const getAccounts = async (lineUserId: string) => {
  const response = await fetch(`${API_BASE_URL}/api/accounts/${lineUserId}`);
  return response.json();
};

// Create new account
export const createAccount = async (lineUserId: string, accountData: any) => {
  const response = await fetch(`${API_BASE_URL}/api/accounts/${lineUserId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(accountData)
  });
  return response.json();
};

// Create transfer
export const createTransfer = async (lineUserId: string, transferData: any) => {
  const response = await fetch(`${API_BASE_URL}/api/transfers/${lineUserId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(transferData)
  });
  return response.json();
};

// Create transaction (with accountId)
export const createTransaction = async (lineUserId: string, transactionData: any) => {
  const response = await fetch(`${API_BASE_URL}/api/transactions/${lineUserId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...transactionData,
      accountId: transactionData.accountId // 必須包含 accountId
    })
  });
  return response.json();
};
```

---

## ✨ Backend Integration Complete!

### What's been implemented:
✅ Prisma schema updated with Account & Transfer models  
✅ Database migrated successfully  
✅ Account CRUD APIs (GET/POST/PATCH/DELETE)  
✅ Transfer APIs with exchange rate support  
✅ Transaction API updated with accountId support  
✅ Balance validation and atomic operations  
✅ Seed script for default account creation  

### Next steps:
1. Update frontend `services/api.ts` with new endpoints
2. Replace `MOCK_ACCOUNTS` with real API calls
3. Update `BuyStockModal` to call `createTransaction` with `accountId`
4. Update LINE Bot handlers to support account selection
5. Add exchange rate API integration

### Test the server:
```bash
# Terminal 1: Start backend
cd /Users/wen/Documents/smartcapital/server
PORT=3002 npx tsx src/index.ts

# Terminal 2: Run tests
curl http://localhost:3002/health
```
