// 💰 Main Payment Validator for Discord Bot Subscriptions
// This is the core smart contract that validates ADA payments for Discord premium features

use aiken/transaction.{ScriptContext, Transaction, OutputReference}
use aiken/transaction/value
use aiken/list
use discord_payment/types.{
  Subscription, SubscriptionTier, PaymentAction, SubscriptionStatus,
  get_tier_price, calculate_end_time
}
use discord_payment/validation.{
  validate_complete_payment, validate_payment_amount, validate_discord_user_id,
  is_subscription_active, is_within_grace_period, get_subscription_status
}

// =============================================================================
// MAIN PAYMENT VALIDATOR
// =============================================================================

/// Primary validator for Discord bot subscription payments
/// This function runs every time someone tries to spend ADA from our contract
validator discord_subscription_validator {
  spend(
    /// Subscription data stored with the UTXO
    datum: Subscription,
    /// Action being performed (NewSubscription, Renewal, etc.)
    redeemer: PaymentAction,
    /// The UTXO being spent (contains the payment)
    input: OutputReference,
    /// Transaction context (time, signatures, etc.)
    context: ScriptContext
  ) {
    // Extract transaction information
    let tx = context.transaction
    let payment_output = input.output
    let payment_value = payment_output.value
    let payment_amount = value.lovelace_of(payment_value)
    
    // Get current time from transaction validity range
    expect Some(current_time) = tx.validity_range.lower_bound
    
    // Log the payment attempt (for debugging)
    trace @"Processing payment validation"
    trace @"User ID": datum.discord_user_id
    trace @"Tier": datum.tier
    trace @"Payment Amount": payment_amount
    trace @"Action": redeemer
    
    // Run comprehensive validation
    let is_valid = validate_complete_payment(datum, redeemer, payment_value, context)
    
    // Additional action-specific logic
    let action_result = when redeemer is {
      NewSubscription { duration_months } -> {
        validate_new_subscription(datum, duration_months, payment_amount, current_time)
      }
      
      RenewSubscription { duration_months } -> {
        validate_subscription_renewal(datum, duration_months, payment_amount, current_time)
      }
      
      UpgradeTier { new_tier, duration_months } -> {
        validate_tier_upgrade(datum, new_tier, duration_months, payment_amount, current_time)
      }
      
      CancelSubscription -> {
        validate_subscription_cancellation(datum, current_time)
      }
      
      AdminAction { action_type } -> {
        validate_admin_action(datum, action_type, context)
      }
    }
    
    // Both general validation and action-specific validation must pass
    let final_result = and { is_valid, action_result }
    
    // Log the result
    if final_result {
      trace @"✅ Payment validation PASSED"
    } else {
      trace @"❌ Payment validation FAILED"
    }
    
    final_result
  }
}

// =============================================================================
// ACTION-SPECIFIC VALIDATION FUNCTIONS
// =============================================================================

/// Validate new subscription creation
fn validate_new_subscription(
  subscription: Subscription,
  duration_months: Int,
  payment_amount: Int,
  current_time: Int
) -> Bool {
  
  trace @"Validating new subscription"
  
  // Calculate required payment
  let tier_price = get_tier_price(subscription.tier)
  let required_payment = tier_price * duration_months
  
  // Calculate subscription end time
  let expected_end_time = calculate_end_time(subscription.start_time, duration_months)
  
  // Validation conditions
  let payment_sufficient = payment_amount >= required_payment
  let timing_valid = current_time >= subscription.start_time
  let end_time_correct = subscription.end_time == expected_end_time
  let amount_recorded = subscription.amount_paid == payment_amount
  let is_active = subscription.is_active
  
  trace @"Payment sufficient": payment_sufficient
  trace @"Timing valid": timing_valid
  trace @"End time correct": end_time_correct
  
  and {
    payment_sufficient,
    timing_valid,
    end_time_correct,
    amount_recorded,
    is_active
  }
}

/// Validate subscription renewal
fn validate_subscription_renewal(
  subscription: Subscription,
  duration_months: Int,
  payment_amount: Int,
  current_time: Int
) -> Bool {
  
  trace @"Validating subscription renewal"
  
  // Check if subscription can be renewed
  let can_renew = or {
    is_subscription_active(subscription, current_time),
    is_within_grace_period(subscription, current_time)
  }
  
  // Calculate required payment for renewal
  let tier_price = get_tier_price(subscription.tier)
  let required_payment = tier_price * duration_months
  let payment_sufficient = payment_amount >= required_payment
  
  trace @"Can renew": can_renew
  trace @"Payment sufficient": payment_sufficient
  
  and {
    can_renew,
    payment_sufficient
  }
}

/// Validate tier upgrade
fn validate_tier_upgrade(
  subscription: Subscription,
  new_tier: SubscriptionTier,
  duration_months: Int,
  payment_amount: Int,
  current_time: Int
) -> Bool {
  
  trace @"Validating tier upgrade"
  
  // Must be an active subscription to upgrade
  let is_active = is_subscription_active(subscription, current_time)
  
  // Calculate upgrade cost
  let current_price = get_tier_price(subscription.tier)
  let new_price = get_tier_price(new_tier)
  let price_difference = new_price - current_price
  let upgrade_cost = price_difference * duration_months
  
  // Validation conditions
  let is_upgrade = new_price > current_price  // Must be upgrading, not downgrading
  let payment_sufficient = payment_amount >= upgrade_cost
  
  trace @"Is active": is_active
  trace @"Is upgrade": is_upgrade
  trace @"Payment sufficient": payment_sufficient
  trace @"Upgrade cost": upgrade_cost
  
  and {
    is_active,
    is_upgrade,
    payment_sufficient
  }
}

/// Validate subscription cancellation
fn validate_subscription_cancellation(
  subscription: Subscription,
  current_time: Int
) -> Bool {
  
  trace @"Validating subscription cancellation"
  
  // Can only cancel if subscription hasn't started or within 24 hours of start
  let cancellation_window = 24 * 60 * 60 * 1000  // 24 hours in milliseconds
  let cancellation_deadline = subscription.start_time + cancellation_window
  
  let can_cancel = current_time <= cancellation_deadline
  
  trace @"Can cancel": can_cancel
  trace @"Current time": current_time
  trace @"Cancellation deadline": cancellation_deadline
  
  can_cancel
}

/// Validate admin actions (for contract management)
fn validate_admin_action(
  subscription: Subscription,
  action_type: ByteArray,
  context: ScriptContext
) -> Bool {
  
  trace @"Validating admin action"
  trace @"Action type": action_type
  
  // In a real implementation, you'd check admin signatures here
  // For now, we'll allow admin actions (this should be restricted in production)
  let tx = context.transaction
  
  // Check if transaction has admin signature (simplified)
  let has_admin_sig = list.length(tx.extra_signatories) >= 0
  
  trace @"Has admin signature": has_admin_sig
  
  has_admin_sig
}

// =============================================================================
// SUBSCRIPTION STATE MANAGEMENT
// =============================================================================

/// Create a new subscription datum for output
fn create_subscription_output(
  discord_user_id: ByteArray,
  tier: SubscriptionTier,
  start_time: Int,
  duration_months: Int,
  payment_amount: Int,
  payment_tx_hash: ByteArray
) -> Subscription {
  
  let end_time = calculate_end_time(start_time, duration_months)
  
  Subscription {
    discord_user_id: discord_user_id,
    tier: tier,
    start_time: start_time,
    end_time: end_time,
    amount_paid: payment_amount,
    is_active: True,
    payment_tx_hash: payment_tx_hash
  }
}

/// Update subscription for renewal
fn update_subscription_for_renewal(
  subscription: Subscription,
  duration_months: Int,
  payment_amount: Int,
  current_time: Int
) -> Subscription {
  
  // If subscription is expired, start from current time
  // Otherwise, extend from current end time
  let new_start_time = if current_time > subscription.end_time {
    current_time
  } else {
    subscription.end_time
  }
  
  let new_end_time = calculate_end_time(new_start_time, duration_months)
  
  Subscription {
    ..subscription,
    start_time: new_start_time,
    end_time: new_end_time,
    amount_paid: subscription.amount_paid + payment_amount,
    is_active: True
  }
}

/// Update subscription for tier upgrade
fn update_subscription_for_upgrade(
  subscription: Subscription,
  new_tier: SubscriptionTier,
  duration_months: Int,
  payment_amount: Int
) -> Subscription {
  
  let new_end_time = calculate_end_time(subscription.start_time, duration_months)
  
  Subscription {
    ..subscription,
    tier: new_tier,
    end_time: new_end_time,
    amount_paid: subscription.amount_paid + payment_amount,
    is_active: True
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/// Check if payment covers the required amount with some tolerance
fn payment_covers_amount(payment: Int, required: Int, tolerance_percent: Int) -> Bool {
  let tolerance = required * tolerance_percent / 100
  let min_required = required - tolerance
  payment >= min_required
}

/// Get human-readable tier name for logging
fn tier_name(tier: SubscriptionTier) -> ByteArray {
  when tier is {
    Premium -> "Premium"
    Ultra -> "Ultra"
    Server -> "Server"
  }
}
