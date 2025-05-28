// 🧪 Comprehensive Tests for Discord Payment Validator
// These tests ensure our smart contract works correctly in all scenarios

use aiken/transaction.{ScriptContext, Transaction, OutputReference, Output}
use aiken/transaction/value
use aiken/interval.{Interval, Finite}
use discord_payment/types.{
  Subscription, SubscriptionTier, PaymentAction, Premium, Ultra, Server,
  get_tier_price, calculate_end_time
}
use discord_payment/validation.{validate_discord_user_id, is_subscription_active}

// Import our validator
use payment_validator.{discord_subscription_validator}

// =============================================================================
// TEST HELPER FUNCTIONS
// =============================================================================

/// Create a test subscription
fn create_test_subscription(
  user_id: ByteArray,
  tier: SubscriptionTier,
  start_time: Int,
  duration_months: Int,
  payment_amount: Int
) -> Subscription {
  let end_time = calculate_end_time(start_time, duration_months)
  
  Subscription {
    discord_user_id: user_id,
    tier: tier,
    start_time: start_time,
    end_time: end_time,
    amount_paid: payment_amount,
    is_active: True,
    payment_tx_hash: "test_tx_hash"
  }
}

/// Create test script context with given time
fn create_test_context(current_time: Int) -> ScriptContext {
  ScriptContext {
    transaction: Transaction {
      validity_range: Interval {
        lower_bound: Finite(current_time),
        upper_bound: Finite(current_time + 3600000)  // 1 hour validity
      },
      extra_signatories: [],
      // ... other required fields would be here in real implementation
    },
    // ... other required fields
  }
}

/// Create test input with payment amount
fn create_test_input(payment_amount: Int) -> OutputReference {
  OutputReference {
    output: Output {
      value: value.from_lovelace(payment_amount),
      // ... other required fields would be here
    },
    // ... other required fields
  }
}

// =============================================================================
// NEW SUBSCRIPTION TESTS
// =============================================================================

test valid_premium_subscription() {
  let user_id = "1234567890123456789"
  let start_time = 1000000
  let duration = 1
  let payment = 5_000_000  // 5 ADA
  
  let subscription = create_test_subscription(user_id, Premium, start_time, duration, payment)
  let context = create_test_context(1500000)  // Current time during subscription
  let input = create_test_input(payment)
  let action = NewSubscription { duration_months: duration }
  
  discord_subscription_validator.spend(subscription, action, input, context)
}

test valid_ultra_subscription() {
  let user_id = "9876543210987654321"
  let start_time = 2000000
  let duration = 3  // 3 months
  let payment = 30_000_000  // 30 ADA (10 ADA * 3 months)
  
  let subscription = create_test_subscription(user_id, Ultra, start_time, duration, payment)
  let context = create_test_context(2500000)
  let input = create_test_input(payment)
  let action = NewSubscription { duration_months: duration }
  
  discord_subscription_validator.spend(subscription, action, input, context)
}

test valid_server_subscription() {
  let user_id = "1111111111111111111"
  let start_time = 3000000
  let duration = 12  // 1 year
  let payment = 600_000_000  // 600 ADA (50 ADA * 12 months)
  
  let subscription = create_test_subscription(user_id, Server, start_time, duration, payment)
  let context = create_test_context(3500000)
  let input = create_test_input(payment)
  let action = NewSubscription { duration_months: duration }
  
  discord_subscription_validator.spend(subscription, action, input, context)
}

// =============================================================================
// PAYMENT VALIDATION TESTS
// =============================================================================

test insufficient_payment_rejected() {
  let user_id = "1234567890123456789"
  let start_time = 1000000
  let duration = 1
  let payment = 3_000_000  // Only 3 ADA - insufficient for Premium!
  
  let subscription = create_test_subscription(user_id, Premium, start_time, duration, payment)
  let context = create_test_context(1500000)
  let input = create_test_input(payment)
  let action = NewSubscription { duration_months: duration }
  
  // This should fail
  !discord_subscription_validator.spend(subscription, action, input, context)
}

test overpayment_accepted() {
  let user_id = "1234567890123456789"
  let start_time = 1000000
  let duration = 1
  let payment = 8_000_000  // 8 ADA - overpayment (tip)
  
  let subscription = create_test_subscription(user_id, Premium, start_time, duration, payment)
  let context = create_test_context(1500000)
  let input = create_test_input(payment)
  let action = NewSubscription { duration_months: duration }
  
  // Should accept overpayment as tip
  discord_subscription_validator.spend(subscription, action, input, context)
}

test excessive_overpayment_rejected() {
  let user_id = "1234567890123456789"
  let start_time = 1000000
  let duration = 1
  let payment = 20_000_000  // 20 ADA - too much (4x required)
  
  let subscription = create_test_subscription(user_id, Premium, start_time, duration, payment)
  let context = create_test_context(1500000)
  let input = create_test_input(payment)
  let action = NewSubscription { duration_months: duration }
  
  // Should reject excessive overpayment
  !discord_subscription_validator.spend(subscription, action, input, context)
}

// =============================================================================
// DISCORD USER ID VALIDATION TESTS
// =============================================================================

test valid_discord_id_accepted() {
  let valid_id = "1234567890123456789"  // 19 digits
  validate_discord_user_id(valid_id)
}

test short_discord_id_rejected() {
  let short_id = "123456789"  // Too short
  !validate_discord_user_id(short_id)
}

test long_discord_id_rejected() {
  let long_id = "12345678901234567890"  // Too long (20 digits)
  !validate_discord_user_id(long_id)
}

// =============================================================================
// SUBSCRIPTION RENEWAL TESTS
// =============================================================================

test valid_subscription_renewal() {
  let user_id = "1234567890123456789"
  let start_time = 1000000
  let end_time = 3600000  // 1 hour later
  let original_payment = 5_000_000
  let renewal_payment = 5_000_000
  
  let subscription = Subscription {
    discord_user_id: user_id,
    tier: Premium,
    start_time: start_time,
    end_time: end_time,
    amount_paid: original_payment,
    is_active: True,
    payment_tx_hash: "original_tx"
  }
  
  let context = create_test_context(2000000)  // During active period
  let input = create_test_input(renewal_payment)
  let action = RenewSubscription { duration_months: 1 }
  
  discord_subscription_validator.spend(subscription, action, input, context)
}

test renewal_in_grace_period() {
  let user_id = "1234567890123456789"
  let start_time = 1000000
  let end_time = 2000000  // Subscription ended
  let original_payment = 5_000_000
  let renewal_payment = 5_000_000
  
  let subscription = Subscription {
    discord_user_id: user_id,
    tier: Premium,
    start_time: start_time,
    end_time: end_time,
    amount_paid: original_payment,
    is_active: True,
    payment_tx_hash: "original_tx"
  }
  
  // Current time is 3 days after expiry (within 7-day grace period)
  let grace_period_time = end_time + (3 * 24 * 60 * 60 * 1000)
  let context = create_test_context(grace_period_time)
  let input = create_test_input(renewal_payment)
  let action = RenewSubscription { duration_months: 1 }
  
  discord_subscription_validator.spend(subscription, action, input, context)
}

test renewal_after_grace_period_rejected() {
  let user_id = "1234567890123456789"
  let start_time = 1000000
  let end_time = 2000000
  let original_payment = 5_000_000
  let renewal_payment = 5_000_000
  
  let subscription = Subscription {
    discord_user_id: user_id,
    tier: Premium,
    start_time: start_time,
    end_time: end_time,
    amount_paid: original_payment,
    is_active: True,
    payment_tx_hash: "original_tx"
  }
  
  // Current time is 10 days after expiry (past grace period)
  let past_grace_time = end_time + (10 * 24 * 60 * 60 * 1000)
  let context = create_test_context(past_grace_time)
  let input = create_test_input(renewal_payment)
  let action = RenewSubscription { duration_months: 1 }
  
  // Should fail - past grace period
  !discord_subscription_validator.spend(subscription, action, input, context)
}

// =============================================================================
// TIER UPGRADE TESTS
// =============================================================================

test valid_tier_upgrade() {
  let user_id = "1234567890123456789"
  let start_time = 1000000
  let end_time = 3600000
  let original_payment = 5_000_000  // Premium
  let upgrade_payment = 5_000_000   // 5 ADA difference for 1 month
  
  let subscription = Subscription {
    discord_user_id: user_id,
    tier: Premium,
    start_time: start_time,
    end_time: end_time,
    amount_paid: original_payment,
    is_active: True,
    payment_tx_hash: "original_tx"
  }
  
  let context = create_test_context(2000000)  // During active period
  let input = create_test_input(upgrade_payment)
  let action = UpgradeTier { new_tier: Ultra, duration_months: 1 }
  
  discord_subscription_validator.spend(subscription, action, input, context)
}

test downgrade_rejected() {
  let user_id = "1234567890123456789"
  let start_time = 1000000
  let end_time = 3600000
  let original_payment = 10_000_000  // Ultra
  let downgrade_payment = 1_000_000  // Trying to "downgrade" to Premium
  
  let subscription = Subscription {
    discord_user_id: user_id,
    tier: Ultra,
    start_time: start_time,
    end_time: end_time,
    amount_paid: original_payment,
    is_active: True,
    payment_tx_hash: "original_tx"
  }
  
  let context = create_test_context(2000000)
  let input = create_test_input(downgrade_payment)
  let action = UpgradeTier { new_tier: Premium, duration_months: 1 }
  
  // Should fail - can't downgrade
  !discord_subscription_validator.spend(subscription, action, input, context)
}

// =============================================================================
// CANCELLATION TESTS
// =============================================================================

test valid_cancellation_before_start() {
  let user_id = "1234567890123456789"
  let start_time = 5000000  // Future start time
  let end_time = 8600000
  let payment = 5_000_000
  
  let subscription = create_test_subscription(user_id, Premium, start_time, 1, payment)
  let context = create_test_context(4000000)  // Before start time
  let input = create_test_input(0)  // No payment for cancellation
  let action = CancelSubscription
  
  discord_subscription_validator.spend(subscription, action, input, context)
}

test cancellation_after_24_hours_rejected() {
  let user_id = "1234567890123456789"
  let start_time = 1000000
  let end_time = 4600000
  let payment = 5_000_000
  
  let subscription = create_test_subscription(user_id, Premium, start_time, 1, payment)
  // 48 hours after start (past 24-hour cancellation window)
  let context = create_test_context(start_time + (48 * 60 * 60 * 1000))
  let input = create_test_input(0)
  let action = CancelSubscription
  
  // Should fail - past cancellation window
  !discord_subscription_validator.spend(subscription, action, input, context)
}

// =============================================================================
// TIMING VALIDATION TESTS
// =============================================================================

test subscription_in_past_rejected() {
  let user_id = "1234567890123456789"
  let start_time = 1000000
  let duration = 1
  let payment = 5_000_000
  
  let subscription = create_test_subscription(user_id, Premium, start_time, duration, payment)
  let context = create_test_context(500000)  // Before start time
  let input = create_test_input(payment)
  let action = NewSubscription { duration_months: duration }
  
  // Should fail - trying to create subscription in the past
  !discord_subscription_validator.spend(subscription, action, input, context)
}

// =============================================================================
// EDGE CASE TESTS
// =============================================================================

test zero_payment_rejected() {
  let user_id = "1234567890123456789"
  let start_time = 1000000
  let duration = 1
  let payment = 0  // Zero payment
  
  let subscription = create_test_subscription(user_id, Premium, start_time, duration, payment)
  let context = create_test_context(1500000)
  let input = create_test_input(payment)
  let action = NewSubscription { duration_months: duration }
  
  !discord_subscription_validator.spend(subscription, action, input, context)
}

test maximum_duration_accepted() {
  let user_id = "1234567890123456789"
  let start_time = 1000000
  let duration = 12  // Maximum 12 months
  let payment = 60_000_000  // 60 ADA (5 ADA * 12 months)
  
  let subscription = create_test_subscription(user_id, Premium, start_time, duration, payment)
  let context = create_test_context(1500000)
  let input = create_test_input(payment)
  let action = NewSubscription { duration_months: duration }
  
  discord_subscription_validator.spend(subscription, action, input, context)
}

test excessive_duration_rejected() {
  let user_id = "1234567890123456789"
  let start_time = 1000000
  let duration = 24  // Too long (over 12 months)
  let payment = 120_000_000
  
  let subscription = create_test_subscription(user_id, Premium, start_time, duration, payment)
  let context = create_test_context(1500000)
  let input = create_test_input(payment)
  let action = NewSubscription { duration_months: duration }
  
  !discord_subscription_validator.spend(subscription, action, input, context)
}
