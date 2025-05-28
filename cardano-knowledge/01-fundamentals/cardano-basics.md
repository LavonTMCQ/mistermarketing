# 🏗️ Cardano Fundamentals for Discord Bot Payments

## 🎯 **What You Need to Know for Our Project**

This document covers ONLY the Cardano concepts needed to build our Discord bot payment system.

---

## 💰 **UTXO Model (The Foundation)**

### **What is UTXO?**
UTXO = Unspent Transaction Output. Think of it like digital cash:

```
Traditional Banking (Account Model):
- Alice has $100 in account
- Alice sends $30 to Bob
- Alice now has $70 in account

Cardano (UTXO Model):
- Alice has a $100 UTXO
- Alice creates transaction: spend $100 UTXO → create $30 UTXO for Bob + $70 UTXO for Alice
- Original $100 UTXO is "consumed" (spent)
```

### **Why This Matters for Our Bot:**
- **Payments are atomic** - Either the full payment happens or nothing
- **No double spending** - Once a UTXO is spent, it's gone forever
- **Easy to verify** - We can check if specific payment UTXO exists
- **Perfect for subscriptions** - Each payment creates a unique UTXO we can track

---

## 🏠 **Addresses and Wallets**

### **Address Types We'll Use:**

#### **1. Payment Addresses (User Wallets)**
```
addr1q8j7... (Mainnet)
addr_test1q... (Testnet)
```
- Where users send ADA from
- We'll verify payments came from these

#### **2. Script Addresses (Our Smart Contract)**
```
addr1w9... (Mainnet script address)
addr_test1w... (Testnet script address)
```
- Where users send ADA to pay for premium features
- Controlled by our smart contract logic

### **For Our Discord Bot:**
- **Generate unique payment addresses** for each user/subscription
- **Monitor these addresses** for incoming payments
- **Verify payment amounts** match our pricing tiers

---

## 💸 **Transactions and Payments**

### **Transaction Structure:**
```
Transaction {
  inputs: [UTXO1, UTXO2, ...],     // UTXOs being spent
  outputs: [NewUTXO1, NewUTXO2, ...], // New UTXOs being created
  fee: 0.17 ADA,                   // Network fee
  metadata: {...},                 // Optional data (Discord user ID!)
  validity_range: {...}            // When transaction is valid
}
```

### **Our Payment Flow:**
```
1. User wants Premium (5 ADA/month)
2. Bot generates payment address: addr_test1w...xyz
3. User sends 5 ADA to that address
4. Transaction creates UTXO at our script address
5. Our contract validates: amount >= 5 ADA
6. Bot detects payment and grants Discord premium role
```

---

## 🔐 **Smart Contracts (Validators)**

### **What is a Validator?**
A validator is a function that decides if a transaction is allowed:

```aiken
validator payment_validator {
  spend(datum, redeemer, input, context) {
    // Check if payment is valid
    let payment_amount = value.lovelace_of(input.output.value)
    let required_amount = 5_000_000  // 5 ADA in lovelace
    
    payment_amount >= required_amount
  }
}
```

### **Key Concepts:**
- **Datum** - Data stored with the UTXO (subscription info, Discord user ID)
- **Redeemer** - Data provided when spending (proof of payment)
- **Context** - Transaction information (inputs, outputs, time, etc.)

### **For Our Bot:**
- **Payment validator** - Ensures correct ADA amount paid
- **Subscription validator** - Manages monthly/yearly subscriptions
- **Access validator** - Controls premium feature access

---

## ⏰ **Time and Validity**

### **POSIXTime in Cardano:**
```aiken
// Current time in milliseconds since Unix epoch
let current_time = context.transaction.validity_range.lower_bound

// One month from now (30 days)
let expiry_time = current_time + 30 * 24 * 60 * 60 * 1000
```

### **For Subscriptions:**
```aiken
type Subscription {
  user_id: ByteArray,        // Discord user ID
  tier: SubscriptionTier,    // Premium, Ultra, etc.
  start_time: POSIXTime,     // When subscription started
  end_time: POSIXTime,       // When it expires
  payment_amount: Int        // ADA paid (in lovelace)
}
```

---

## 🏷️ **Metadata and User Identification**

### **Transaction Metadata:**
We can include Discord user ID in transaction metadata:

```json
{
  "674": {
    "discord_user_id": "1234567890123456789",
    "subscription_tier": "premium",
    "duration_months": 1
  }
}
```

### **Why This is Perfect:**
- **Immutable** - Once on blockchain, can't be changed
- **Verifiable** - Anyone can check the metadata
- **Automatic** - Our bot can read it and grant access
- **Transparent** - Users can verify their payments

---

## 💎 **ADA and Lovelace**

### **Currency Units:**
```
1 ADA = 1,000,000 lovelace
```

### **Our Pricing in Lovelace:**
```aiken
// Subscription tiers
let premium_price = 5_000_000   // 5 ADA
let ultra_price = 10_000_000    // 10 ADA
let server_price = 50_000_000   // 50 ADA
```

### **Why Use Lovelace:**
- **Precision** - No decimal math errors
- **Aiken standard** - All calculations in lovelace
- **Blockchain native** - Cardano stores values in lovelace

---

## 🔄 **Our Complete Payment Flow**

### **Step-by-Step Process:**

#### **1. User Requests Premium**
```
Discord: /stickerize quality:premium
Bot: "Premium requires 5 ADA payment. Send to: addr_test1w...xyz"
```

#### **2. User Sends Payment**
```
User wallet → 5 ADA → Our script address
Transaction includes metadata: {"discord_user_id": "123..."}
```

#### **3. Smart Contract Validates**
```aiken
validator subscription_payment {
  spend(datum, redeemer, input, context) {
    let payment = value.lovelace_of(input.output.value)
    let required = 5_000_000  // 5 ADA
    
    and {
      payment >= required,
      // Additional validation logic...
    }
  }
}
```

#### **4. Bot Detects and Processes**
```javascript
// Monitor blockchain for payments to our address
// Read transaction metadata for Discord user ID
// Grant premium role to user
// Update internal subscription database
```

#### **5. User Gets Access**
```
Discord: "✅ Premium activated! Enjoy unlimited high-quality animations!"
```

---

## 🛠️ **Tools We'll Use**

### **Development:**
- **Aiken** - Write smart contracts
- **Cardano CLI** - Deploy contracts and build transactions
- **Node.js** - Discord bot and blockchain monitoring

### **APIs:**
- **Blockfrost** - Query blockchain data
- **Cardano Serialization Library** - Build transactions in JavaScript

### **Testing:**
- **Cardano Testnet** - Test with fake ADA
- **Aiken Test Framework** - Unit test our contracts

---

## 🎯 **Key Takeaways for Our Project**

1. **UTXO Model** - Perfect for tracking individual payments
2. **Script Addresses** - Our smart contract controls the payment logic
3. **Metadata** - Links Discord users to their payments
4. **Time Validation** - Handles subscription expiry automatically
5. **Atomic Transactions** - Payments either work completely or fail completely

---

## 📚 **Next Steps**

After understanding these basics:
1. **Learn Aiken syntax** - `aiken-syntax.md`
2. **Study payment validation** - `../02-payment-contracts/payment-validation.md`
3. **Practice with examples** - `../04-implementation/contract-templates/`

---

**🚀 Ready to dive deeper? You now understand the foundation of Cardano that powers our revolutionary Discord payment system!**
