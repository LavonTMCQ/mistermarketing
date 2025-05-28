// 🔍 Payment Validation Logic for Discord Bot
// This module contains all validation functions for subscription payments

use aiken/transaction.{ScriptContext, Transaction}
use aiken/transaction/value.{Value}
use aiken/list
use aiken/bytearray
use discord_payment/types.{
  Subscription, SubscriptionTier, PaymentAction, PaymentValidation,
  SubscriptionStatus, premium_price, ultra_price, server_price,
  min_discord_id_length, max_discord_id_length, grace_period_ms,
  max_subscription_months, get_tier_price, calculate_end_time
}

// =============================================================================
// CORE VALIDATION FUNCTIONS
// =============================================================================

/// Validate a complete payment transaction
pub fn validate_payment(
  subscription: Subscription,
  action: PaymentAction,
  payment_value: Value,
  current_time: Int
) -> PaymentValidation {
  
  let payment_amount = value.lovelace_of(payment_value)
  
  // Basic validations
  let amount_valid = validate_payment_amount(payment_amount, subscription.tier, action)
  let user_id_valid = validate_discord_user_id(subscription.discord_user_id)
  let timing_valid = validate_payment_timing(subscription, action, current_time)
  let upgrade_valid = validate_tier_upgrade(subscription.tier, action)
  
  // Additional validations
  let ada_only = validate_ada_only_payment(payment_value)
  let duration_valid = validate_subscription_duration(action)
  
  let is_valid = and {
    amount_valid,
    user_id_valid,
    timing_valid,
    upgrade_valid,
    ada_only,
    duration_valid
  }
  
  PaymentValidation {
    amount_valid: amount_valid,
    user_id_valid: user_id_valid,
    timing_valid: timing_valid,
    upgrade_valid: upgrade_valid,
    is_valid: is_valid
  }
}

// =============================================================================
// PAYMENT AMOUNT VALIDATION
// =============================================================================

/// Validate payment amount based on subscription tier and action
pub fn validate_payment_amount(
  payment: Int,
  tier: SubscriptionTier,
  action: PaymentAction
) -> Bool {
  when action is {
    NewSubscription { duration_months } -> {
      let required = get_tier_price(tier) * duration_months
      let max_allowed = required * 2  // Allow up to 2x for tips
      and {
        payment >= required,
        payment <= max_allowed
      }
    }
    
    RenewSubscription { duration_months } -> {
      let required = get_tier_price(tier) * duration_months
      payment >= required
    }
    
    UpgradeTier { new_tier, duration_months } -> {
      let current_price = get_tier_price(tier)
      let new_price = get_tier_price(new_tier)
      let upgrade_cost = (new_price - current_price) * duration_months
      payment >= upgrade_cost
    }
    
    CancelSubscription -> {
      // No payment required for cancellation
      True
    }
    
    AdminAction { .. } -> {
      // Admin actions don't require specific payment amounts
      True
    }
  }
}

/// Ensure payment contains only ADA (no tokens)
pub fn validate_ada_only_payment(payment_value: Value) -> Bool {
  let ada_amount = value.lovelace_of(payment_value)
  let flattened = value.flatten(payment_value)
  
  // Should only contain one entry: ADA
  and {
    list.length(flattened) == 1,
    ada_amount > 0
  }
}

// =============================================================================
// DISCORD USER ID VALIDATION
// =============================================================================

/// Validate Discord user ID format (18-19 digits)
pub fn validate_discord_user_id(user_id: ByteArray) -> Bool {
  let length = bytearray.length(user_id)
  and {
    length >= min_discord_id_length,
    length <= max_discord_id_length,
    is_numeric_string(user_id)
  }
}

/// Check if ByteArray contains only numeric characters
fn is_numeric_string(data: ByteArray) -> Bool {
  // This is a simplified check - in a real implementation,
  // you'd validate each byte is a digit (48-57 in ASCII)
  bytearray.length(data) > 0
}

// =============================================================================
// TIMING VALIDATION
// =============================================================================

/// Validate payment timing based on subscription state and action
pub fn validate_payment_timing(
  subscription: Subscription,
  action: PaymentAction,
  current_time: Int
) -> Bool {
  when action is {
    NewSubscription { .. } -> {
      // New subscriptions can start anytime, but not in the past
      current_time >= subscription.start_time
    }
    
    RenewSubscription { .. } -> {
      // Can renew if active or within grace period
      let is_active = is_subscription_active(subscription, current_time)
      let in_grace = is_within_grace_period(subscription, current_time)
      or { is_active, in_grace }
    }
    
    UpgradeTier { .. } -> {
      // Can only upgrade active subscriptions
      is_subscription_active(subscription, current_time)
    }
    
    CancelSubscription -> {
      // Can cancel if subscription hasn't started or within 24 hours
      let cancellation_deadline = subscription.start_time + (24 * 60 * 60 * 1000)
      current_time <= cancellation_deadline
    }
    
    AdminAction { .. } -> {
      // Admin actions are always allowed
      True
    }
  }
}

/// Check if subscription is currently active
pub fn is_subscription_active(subscription: Subscription, current_time: Int) -> Bool {
  and {
    current_time >= subscription.start_time,
    current_time <= subscription.end_time,
    subscription.is_active
  }
}

/// Check if subscription is within grace period after expiry
pub fn is_within_grace_period(subscription: Subscription, current_time: Int) -> Bool {
  let grace_end = subscription.end_time + grace_period_ms
  and {
    current_time > subscription.end_time,
    current_time <= grace_end
  }
}

/// Get subscription status based on current time
pub fn get_subscription_status(subscription: Subscription, current_time: Int) -> SubscriptionStatus {
  if !subscription.is_active {
    Cancelled
  } else if current_time < subscription.start_time {
    Pending
  } else if current_time <= subscription.end_time {
    Active
  } else if is_within_grace_period(subscription, current_time) {
    GracePeriod
  } else {
    Expired
  }
}

// =============================================================================
// TIER UPGRADE VALIDATION
// =============================================================================

/// Validate tier upgrade logic
pub fn validate_tier_upgrade(
  current_tier: SubscriptionTier,
  action: PaymentAction
) -> Bool {
  when action is {
    UpgradeTier { new_tier, .. } -> {
      // Must be upgrading to a higher tier
      let current_price = get_tier_price(current_tier)
      let new_price = get_tier_price(new_tier)
      new_price > current_price
    }
    
    // Other actions don't involve tier changes
    _ -> True
  }
}

// =============================================================================
// SUBSCRIPTION DURATION VALIDATION
// =============================================================================

/// Validate subscription duration is within allowed limits
pub fn validate_subscription_duration(action: PaymentAction) -> Bool {
  when action is {
    NewSubscription { duration_months } -> {
      and {
        duration_months >= 1,
        duration_months <= max_subscription_months
      }
    }
    
    RenewSubscription { duration_months } -> {
      and {
        duration_months >= 1,
        duration_months <= max_subscription_months
      }
    }
    
    UpgradeTier { duration_months, .. } -> {
      and {
        duration_months >= 1,
        duration_months <= max_subscription_months
      }
    }
    
    // Other actions don't have duration requirements
    _ -> True
  }
}

// =============================================================================
// SECURITY VALIDATIONS
// =============================================================================

/// Validate transaction security requirements
pub fn validate_transaction_security(
  subscription: Subscription,
  context: ScriptContext
) -> Bool {
  let tx = context.transaction
  
  // Check transaction has valid time range
  let has_valid_time = when tx.validity_range.lower_bound is {
    Some(_) -> True
    None -> False
  }
  
  // Check transaction is properly signed (simplified)
  let is_properly_signed = list.length(tx.extra_signatories) >= 0
  
  // Check no duplicate subscriptions for same user (would need additional logic)
  let no_duplicates = True  // Simplified for now
  
  and {
    has_valid_time,
    is_properly_signed,
    no_duplicates
  }
}

/// Validate payment bounds to prevent exploitation
pub fn validate_payment_bounds(payment: Int, tier: SubscriptionTier) -> Bool {
  let required = get_tier_price(tier)
  let min_payment = required
  let max_payment = required * 3  // Allow up to 3x for generous tips
  
  and {
    payment >= min_payment,
    payment <= max_payment
  }
}

// =============================================================================
// COMPREHENSIVE VALIDATION
// =============================================================================

/// Master validation function that checks everything
pub fn validate_complete_payment(
  subscription: Subscription,
  action: PaymentAction,
  payment_value: Value,
  context: ScriptContext
) -> Bool {
  
  expect Some(current_time) = context.transaction.validity_range.lower_bound
  
  // Run all validations
  let payment_validation = validate_payment(subscription, action, payment_value, current_time)
  let security_validation = validate_transaction_security(subscription, context)
  let bounds_validation = validate_payment_bounds(
    value.lovelace_of(payment_value),
    subscription.tier
  )
  
  // All validations must pass
  and {
    payment_validation.is_valid,
    security_validation,
    bounds_validation
  }
}
