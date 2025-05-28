# 💰 Payment Validation Smart Contracts

## 🎯 **Goal: Validate ADA Payments for Discord Bot Premium Features**

This document shows exactly how to build smart contracts that validate ADA payments for our Discord bot.

---

## 🏗️ **Core Payment Validation Logic**

### **Basic Payment Validator**
```aiken
use aiken/transaction.{ScriptContext, Transaction}
use aiken/transaction/value
use aiken/interval.{Interval}

// Our subscription data structure
type Subscription {
  discord_user_id: ByteArray,
  tier: SubscriptionTier,
  start_time: Int,  // POSIXTime in milliseconds
  end_time: Int,    // POSIXTime in milliseconds
  amount_paid: Int  // Lovelace
}

type SubscriptionTier {
  Premium   // 5 ADA/month
  Ultra     // 10 ADA/month
  Server    // 50 ADA/month
}

// Get required payment amount for each tier
fn get_tier_price(tier: SubscriptionTier) -> Int {
  when tier is {
    Premium -> 5_000_000   // 5 ADA
    Ultra -> 10_000_000    // 10 ADA
    Server -> 50_000_000   // 50 ADA
  }
}

validator payment_validator {
  spend(
    datum: Subscription,
    redeemer: ByteArray,  // Could be user signature or proof
    input: OutputReference,
    context: ScriptContext
  ) {
    let tx = context.transaction
    let payment_output = input.output
    
    // Extract payment amount in lovelace
    let payment_amount = value.lovelace_of(payment_output.value)
    
    // Get required amount for this tier
    let required_amount = get_tier_price(datum.tier)
    
    // Get current time from transaction validity range
    expect Some(current_time) = tx.validity_range.lower_bound
    
    // Validation conditions
    let amount_is_sufficient = payment_amount >= required_amount
    let subscription_is_active = current_time >= datum.start_time && current_time <= datum.end_time
    let user_id_is_valid = bytearray.length(datum.discord_user_id) >= 18
    
    // All conditions must be true
    and {
      amount_is_sufficient,
      subscription_is_active,
      user_id_is_valid
    }
  }
}
```

---

## 🔄 **Payment Processing Flow**

### **1. User Initiates Payment**
```javascript
// Discord bot generates payment request
const paymentRequest = {
  discordUserId: "1234567890123456789",
  tier: "Premium",
  durationMonths: 1,
  paymentAddress: "addr_test1w...",  // Our script address
  requiredAmount: "5000000"  // 5 ADA in lovelace
}
```

### **2. Smart Contract Validates Payment**
```aiken
// When user sends ADA to our script address, this validator runs
validator subscription_payment {
  spend(datum: Subscription, redeemer: PaymentAction, input: OutputReference, context: ScriptContext) {
    when redeemer is {
      // New subscription payment
      NewSubscription -> {
        let payment = value.lovelace_of(input.output.value)
        let required = get_tier_price(datum.tier)
        
        and {
          payment >= required,
          is_valid_discord_id(datum.discord_user_id),
          datum.end_time > datum.start_time
        }
      }
      
      // Subscription renewal
      RenewSubscription -> {
        expect Some(current_time) = context.transaction.validity_range.lower_bound
        let payment = value.lovelace_of(input.output.value)
        let required = get_tier_price(datum.tier)
        
        and {
          payment >= required,
          current_time <= datum.end_time + 86400000  // Allow 1 day grace period
        }
      }
      
      // Upgrade subscription tier
      UpgradeTier { new_tier } -> {
        let payment = value.lovelace_of(input.output.value)
        let current_price = get_tier_price(datum.tier)
        let new_price = get_tier_price(new_tier)
        let upgrade_cost = new_price - current_price
        
        payment >= upgrade_cost
      }
    }
  }
}
```

---

## 🕐 **Time-Based Validation**

### **Subscription Duration Logic**
```aiken
// Calculate subscription end time
fn calculate_subscription_end(start_time: Int, months: Int) -> Int {
  let month_in_ms = 30 * 24 * 60 * 60 * 1000  // 30 days in milliseconds
  start_time + (months * month_in_ms)
}

// Check if subscription is currently active
fn is_subscription_active(subscription: Subscription, current_time: Int) -> Bool {
  and {
    current_time >= subscription.start_time,
    current_time <= subscription.end_time
  }
}

// Check if subscription is expiring soon (within 7 days)
fn is_subscription_expiring_soon(subscription: Subscription, current_time: Int) -> Bool {
  let seven_days_ms = 7 * 24 * 60 * 60 * 1000
  let expiry_warning_time = subscription.end_time - seven_days_ms
  
  and {
    current_time >= expiry_warning_time,
    current_time <= subscription.end_time
  }
}
```

### **Grace Period Handling**
```aiken
// Allow renewals within grace period after expiry
fn is_within_grace_period(subscription: Subscription, current_time: Int) -> Bool {
  let grace_period_ms = 7 * 24 * 60 * 60 * 1000  // 7 days
  let grace_end = subscription.end_time + grace_period_ms
  
  and {
    current_time > subscription.end_time,
    current_time <= grace_end
  }
}

validator grace_period_renewal {
  spend(datum: Subscription, redeemer: ByteArray, input: OutputReference, context: ScriptContext) {
    expect Some(current_time) = context.transaction.validity_range.lower_bound
    let payment = value.lovelace_of(input.output.value)
    let required = get_tier_price(datum.tier)
    
    and {
      payment >= required,
      is_within_grace_period(datum, current_time)
    }
  }
}
```

---

## 💎 **Multi-Tier Pricing System**

### **Tier Management**
```aiken
// Subscription tier with benefits
type TierBenefits {
  max_animations_per_hour: Int,
  background_removal: Bool,
  premium_models: Bool,
  priority_processing: Bool
}

fn get_tier_benefits(tier: SubscriptionTier) -> TierBenefits {
  when tier is {
    Premium -> TierBenefits {
      max_animations_per_hour: 50,
      background_removal: True,
      premium_models: False,
      priority_processing: False
    }
    Ultra -> TierBenefits {
      max_animations_per_hour: 200,
      background_removal: True,
      premium_models: True,
      priority_processing: True
    }
    Server -> TierBenefits {
      max_animations_per_hour: 1000,
      background_removal: True,
      premium_models: True,
      priority_processing: True
    }
  }
}

// Validate tier upgrade payment
fn validate_tier_upgrade(
  current_tier: SubscriptionTier,
  new_tier: SubscriptionTier,
  payment: Int,
  remaining_time: Int
) -> Bool {
  let current_price = get_tier_price(current_tier)
  let new_price = get_tier_price(new_tier)
  
  // Calculate prorated upgrade cost
  let price_difference = new_price - current_price
  let month_in_ms = 30 * 24 * 60 * 60 * 1000
  let prorated_cost = (price_difference * remaining_time) / month_in_ms
  
  payment >= prorated_cost
}
```

---

## 🔐 **Security Validations**

### **Discord User ID Validation**
```aiken
// Validate Discord user ID format
fn is_valid_discord_id(user_id: ByteArray) -> Bool {
  let length = bytearray.length(user_id)
  and {
    length >= 18,  // Discord IDs are 18-19 digits
    length <= 19,
    // Additional validation could check if all characters are digits
  }
}

// Prevent duplicate subscriptions for same user
fn check_no_duplicate_subscription(
  user_id: ByteArray,
  existing_subscriptions: List<Subscription>
) -> Bool {
  let user_subscriptions = list.filter(
    existing_subscriptions,
    fn(sub) { sub.discord_user_id == user_id }
  )
  
  list.length(user_subscriptions) == 0
}
```

### **Payment Amount Security**
```aiken
// Prevent overpayment exploitation
fn validate_payment_bounds(payment: Int, tier: SubscriptionTier) -> Bool {
  let required = get_tier_price(tier)
  let max_allowed = required * 2  // Allow up to 2x for tips/mistakes
  
  and {
    payment >= required,
    payment <= max_allowed
  }
}

// Validate payment currency (only ADA, no tokens)
fn validate_ada_only_payment(payment_value: Value) -> Bool {
  // Check that only ADA (lovelace) is in the payment
  let ada_amount = value.lovelace_of(payment_value)
  let total_value = value.flatten(payment_value)
  
  // Should only contain one entry: (ada_policy_id, ada_asset_name, amount)
  list.length(total_value) == 1
}
```

---

## 📊 **Payment Tracking and Analytics**

### **Payment History Datum**
```aiken
type PaymentHistory {
  user_id: ByteArray,
  payments: List<PaymentRecord>
}

type PaymentRecord {
  amount: Int,
  tier: SubscriptionTier,
  timestamp: Int,
  transaction_hash: ByteArray
}

// Add new payment to history
fn add_payment_record(
  history: PaymentHistory,
  amount: Int,
  tier: SubscriptionTier,
  timestamp: Int,
  tx_hash: ByteArray
) -> PaymentHistory {
  let new_record = PaymentRecord {
    amount: amount,
    tier: tier,
    timestamp: timestamp,
    transaction_hash: tx_hash
  }
  
  PaymentHistory {
    user_id: history.user_id,
    payments: list.push(history.payments, new_record)
  }
}
```

---

## 🧪 **Testing Payment Validation**

### **Test Cases**
```aiken
test valid_premium_payment() {
  let subscription = Subscription {
    discord_user_id: "1234567890123456789",
    tier: Premium,
    start_time: 1000000,
    end_time: 3600000,  // 1 hour later
    amount_paid: 5_000_000
  }
  
  let mock_context = create_mock_context(1500000)  // Current time
  let mock_input = create_mock_input(5_000_000)    // 5 ADA payment
  
  payment_validator.spend(subscription, "", mock_input, mock_context)
}

test insufficient_payment_rejected() {
  let subscription = Subscription {
    discord_user_id: "1234567890123456789",
    tier: Premium,
    start_time: 1000000,
    end_time: 3600000,
    amount_paid: 3_000_000  // Only 3 ADA - insufficient!
  }
  
  let mock_context = create_mock_context(1500000)
  let mock_input = create_mock_input(3_000_000)
  
  !payment_validator.spend(subscription, "", mock_input, mock_context)
}

test expired_subscription_rejected() {
  let subscription = Subscription {
    discord_user_id: "1234567890123456789",
    tier: Premium,
    start_time: 1000000,
    end_time: 2000000,
    amount_paid: 5_000_000
  }
  
  let mock_context = create_mock_context(3000000)  // After expiry
  let mock_input = create_mock_input(5_000_000)
  
  !payment_validator.spend(subscription, "", mock_input, mock_context)
}
```

---

## 🎯 **Integration with Discord Bot**

### **Off-Chain Payment Monitoring**
```javascript
// Monitor blockchain for payments to our script address
async function monitorPayments() {
  const payments = await blockfrost.addressesUtxos(SCRIPT_ADDRESS);
  
  for (const utxo of payments) {
    const datum = await extractDatum(utxo);
    if (datum && datum.discord_user_id) {
      await grantDiscordAccess(datum.discord_user_id, datum.tier);
    }
  }
}

// Grant Discord role based on subscription tier
async function grantDiscordAccess(userId, tier) {
  const guild = client.guilds.cache.get(GUILD_ID);
  const member = await guild.members.fetch(userId);
  
  const roleMap = {
    'Premium': PREMIUM_ROLE_ID,
    'Ultra': ULTRA_ROLE_ID,
    'Server': SERVER_ROLE_ID
  };
  
  await member.roles.add(roleMap[tier]);
}
```

---

## 🚀 **Next Steps**

After mastering payment validation:
1. **Learn subscription management** - `subscription-logic.md`
2. **Study Discord integration** - `../03-discord-integration/`
3. **Practice with templates** - `../04-implementation/contract-templates/`

---

**💰 You now know how to validate ADA payments for Discord bot premium features!**
