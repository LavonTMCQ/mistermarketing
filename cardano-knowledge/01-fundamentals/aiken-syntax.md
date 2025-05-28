# 🔧 Aiken Language Syntax for Discord Bot Payments

## 🎯 **Focus: Only What We Need for Payment Contracts**

This guide covers Aiken syntax specifically for building our Discord bot payment system.

---

## 📝 **Basic Syntax**

### **Variables and Constants**
```aiken
// Constants (compile-time)
const premium_price = 5_000_000  // 5 ADA in lovelace
const ultra_price = 10_000_000   // 10 ADA in lovelace

// Variables (runtime)
let user_payment = value.lovelace_of(input.output.value)
let is_valid = user_payment >= premium_price
```

### **Comments**
```aiken
// Single line comment

/// Documentation comment
/// Used for generating docs
```

---

## 🏗️ **Data Types for Our Project**

### **Basic Types**
```aiken
// Numbers (for ADA amounts)
let amount: Int = 5_000_000

// Text (for Discord user IDs)
let user_id: ByteArray = "1234567890123456789"

// Boolean (for validation)
let is_premium: Bool = True

// Lists (for multiple payments)
let payments: List<Int> = [5_000_000, 10_000_000]
```

### **Custom Types for Subscriptions**
```aiken
// Subscription tiers
type SubscriptionTier {
  Premium
  Ultra
  Server
}

// Subscription data
type Subscription {
  user_id: ByteArray,
  tier: SubscriptionTier,
  start_time: Int,  // POSIXTime
  end_time: Int,    // POSIXTime
  amount_paid: Int  // Lovelace
}

// Payment status
type PaymentStatus {
  Pending
  Confirmed
  Expired
}
```

---

## 🔍 **Pattern Matching (Essential for Validation)**

### **Basic Pattern Matching**
```aiken
// Check subscription tier
fn get_price(tier: SubscriptionTier) -> Int {
  when tier is {
    Premium -> 5_000_000
    Ultra -> 10_000_000
    Server -> 50_000_000
  }
}

// Check payment status
fn handle_payment(status: PaymentStatus) -> Bool {
  when status is {
    Pending -> False
    Confirmed -> True
    Expired -> False
  }
}
```

### **Advanced Pattern Matching**
```aiken
// Extract subscription details
fn validate_subscription(sub: Subscription, current_time: Int) -> Bool {
  when sub is {
    Subscription { tier: Premium, end_time, .. } -> 
      end_time > current_time
    Subscription { tier: Ultra, amount_paid, .. } -> 
      amount_paid >= 10_000_000
    _ -> False  // Default case
  }
}
```

---

## 📋 **Lists and Data Manipulation**

### **Working with Payment Lists**
```aiken
use aiken/list

// Check if payment amount is in valid list
let valid_amounts = [5_000_000, 10_000_000, 50_000_000]
let user_payment = 5_000_000

let is_valid_amount = list.has(valid_amounts, user_payment)

// Find specific payment
let premium_payments = list.filter(payments, fn(amount) { amount == 5_000_000 })

// Sum all payments
let total_paid = list.foldr(payments, 0, fn(amount, acc) { amount + acc })
```

### **User ID Validation**
```aiken
// Check if Discord user ID is valid (18-19 digits)
fn is_valid_discord_id(user_id: ByteArray) -> Bool {
  let id_length = bytearray.length(user_id)
  and {
    id_length >= 18,
    id_length <= 19
  }
}
```

---

## ⏰ **Time and Date Handling**

### **Working with POSIXTime**
```aiken
// Time constants
const seconds_per_minute = 60
const minutes_per_hour = 60
const hours_per_day = 24
const days_per_month = 30

const month_in_milliseconds = 
  days_per_month * hours_per_day * minutes_per_hour * seconds_per_minute * 1000

// Calculate subscription expiry
fn calculate_expiry(start_time: Int, months: Int) -> Int {
  start_time + (months * month_in_milliseconds)
}

// Check if subscription is active
fn is_subscription_active(sub: Subscription, current_time: Int) -> Bool {
  and {
    current_time >= sub.start_time,
    current_time <= sub.end_time
  }
}
```

---

## 🔐 **Validator Structure**

### **Basic Payment Validator**
```aiken
validator payment_validator {
  spend(datum: Subscription, redeemer: ByteArray, input: OutputReference, context: ScriptContext) {
    // Extract transaction info
    let tx = context.transaction
    let payment_amount = value.lovelace_of(input.output.value)
    
    // Get current time
    expect Some(current_time) = tx.validity_range.lower_bound
    
    // Validate payment
    let required_amount = get_price(datum.tier)
    let is_amount_valid = payment_amount >= required_amount
    let is_time_valid = is_subscription_active(datum, current_time)
    
    // Both conditions must be true
    and {
      is_amount_valid,
      is_time_valid
    }
  }
}
```

### **Subscription Management Validator**
```aiken
validator subscription_validator {
  spend(datum: Subscription, redeemer: SubscriptionAction, input: OutputReference, context: ScriptContext) {
    when redeemer is {
      // User wants to extend subscription
      Extend { additional_months } -> {
        let payment = value.lovelace_of(input.output.value)
        let required = get_price(datum.tier) * additional_months
        payment >= required
      }
      
      // User wants to upgrade tier
      Upgrade { new_tier } -> {
        let payment = value.lovelace_of(input.output.value)
        let current_price = get_price(datum.tier)
        let new_price = get_price(new_tier)
        let upgrade_cost = new_price - current_price
        payment >= upgrade_cost
      }
      
      // User wants to cancel (refund logic)
      Cancel -> {
        // Only allow if subscription hasn't started
        expect Some(current_time) = context.transaction.validity_range.lower_bound
        current_time < datum.start_time
      }
    }
  }
}
```

---

## 🧪 **Testing Syntax**

### **Unit Tests for Our Validators**
```aiken
test payment_validator_accepts_valid_premium() {
  let subscription = Subscription {
    user_id: "1234567890123456789",
    tier: Premium,
    start_time: 1000000,
    end_time: 2000000,
    amount_paid: 5_000_000
  }
  
  let context = ScriptContext {
    transaction: Transaction {
      validity_range: Interval {
        lower_bound: Some(1500000),  // Current time
        upper_bound: None
      },
      // ... other transaction fields
    },
    // ... other context fields
  }
  
  // Test should pass
  payment_validator.spend(subscription, "", mock_input, context)
}

test payment_validator_rejects_insufficient_payment() {
  let subscription = Subscription {
    user_id: "1234567890123456789",
    tier: Premium,
    start_time: 1000000,
    end_time: 2000000,
    amount_paid: 3_000_000  // Too low!
  }
  
  // Test should fail
  !payment_validator.spend(subscription, "", mock_input, context)
}
```

---

## 🔧 **Helper Functions**

### **Discord Integration Helpers**
```aiken
// Validate Discord user ID format
fn validate_discord_user_id(user_id: ByteArray) -> Bool {
  let length = bytearray.length(user_id)
  and {
    length >= 18,
    length <= 19,
    // Could add more validation (all digits, etc.)
  }
}

// Calculate subscription value
fn calculate_subscription_value(tier: SubscriptionTier, months: Int) -> Int {
  get_price(tier) * months
}

// Check if payment covers subscription
fn is_payment_sufficient(payment: Int, tier: SubscriptionTier, months: Int) -> Bool {
  let required = calculate_subscription_value(tier, months)
  payment >= required
}
```

### **Utility Functions**
```aiken
// Safe division (avoid division by zero)
fn safe_divide(numerator: Int, denominator: Int) -> Option<Int> {
  if denominator == 0 {
    None
  } else {
    Some(numerator / denominator)
  }
}

// Clamp value between min and max
fn clamp(value: Int, min: Int, max: Int) -> Int {
  if value < min {
    min
  } else if value > max {
    max
  } else {
    value
  }
}
```

---

## 🎯 **Common Patterns for Our Project**

### **1. Amount Validation Pattern**
```aiken
fn validate_payment_amount(payment: Int, tier: SubscriptionTier) -> Bool {
  let required = get_price(tier)
  payment >= required
}
```

### **2. Time Range Validation Pattern**
```aiken
fn validate_time_range(start: Int, end: Int, current: Int) -> Bool {
  and {
    current >= start,
    current <= end
  }
}
```

### **3. User Authorization Pattern**
```aiken
fn validate_user_signature(tx: Transaction, user_id: ByteArray) -> Bool {
  // Check if transaction is signed by the user
  list.has(tx.extra_signatories, user_id)
}
```

### **4. Multi-Condition Validation Pattern**
```aiken
fn validate_subscription_payment(
  payment: Int,
  tier: SubscriptionTier,
  user_id: ByteArray,
  current_time: Int,
  start_time: Int
) -> Bool {
  and {
    validate_payment_amount(payment, tier),
    validate_discord_user_id(user_id),
    current_time >= start_time
  }
}
```

---

## 📚 **Key Aiken Concepts for Our Project**

### **1. Immutability**
- All data is immutable by default
- Create new data instead of modifying existing

### **2. Pure Functions**
- Functions have no side effects
- Same input always produces same output
- Perfect for blockchain validation

### **3. Pattern Matching**
- Powerful way to handle different cases
- Essential for subscription tier logic

### **4. Type Safety**
- Compiler catches errors before deployment
- Prevents common smart contract bugs

---

## 🚀 **Next Steps**

Now that you understand Aiken syntax:
1. **Study payment validation** - `../02-payment-contracts/payment-validation.md`
2. **Learn subscription logic** - `../02-payment-contracts/subscription-logic.md`
3. **Practice with templates** - `../04-implementation/contract-templates/`

---

**🎉 You now know enough Aiken to build our Discord payment smart contracts!**
