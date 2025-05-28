// 🎯 Core Data Types for Discord Bot Payment System
// This file defines all the data structures used in our smart contracts

use aiken/hash.{Blake2b_224, Hash}
use aiken/transaction/credential.{Script}

// =============================================================================
// SUBSCRIPTION TYPES
// =============================================================================

/// Discord bot subscription tiers with different features and pricing
pub type SubscriptionTier {
  /// 5 ADA/month - Background removal, 50 animations/hour
  Premium
  /// 10 ADA/month - Premium models, 200 animations/hour, priority processing  
  Ultra
  /// 50 ADA/month - Server-wide access, 1000 animations/hour, all features
  Server
}

/// Complete subscription information stored on-chain
pub type Subscription {
  /// Discord user ID (18-19 digit string)
  discord_user_id: ByteArray,
  /// Subscription tier (Premium, Ultra, Server)
  tier: SubscriptionTier,
  /// When subscription starts (POSIXTime in milliseconds)
  start_time: Int,
  /// When subscription expires (POSIXTime in milliseconds)  
  end_time: Int,
  /// Amount paid for this subscription (in lovelace)
  amount_paid: Int,
  /// Whether subscription is currently active
  is_active: Bool,
  /// Payment transaction hash for verification
  payment_tx_hash: ByteArray
}

// =============================================================================
// PAYMENT ACTIONS
// =============================================================================

/// Actions that can be performed on subscription payments
pub type PaymentAction {
  /// Create a new subscription payment
  NewSubscription { 
    duration_months: Int 
  }
  /// Renew an existing subscription
  RenewSubscription { 
    duration_months: Int 
  }
  /// Upgrade to a higher tier
  UpgradeTier { 
    new_tier: SubscriptionTier,
    duration_months: Int 
  }
  /// Cancel subscription and request refund
  CancelSubscription
  /// Admin action to modify subscription
  AdminAction { 
    action_type: ByteArray 
  }
}

// =============================================================================
// PAYMENT VALIDATION
// =============================================================================

/// Payment validation result
pub type PaymentValidation {
  /// Whether payment amount is sufficient
  amount_valid: Bool,
  /// Whether Discord user ID is valid format
  user_id_valid: Bool,
  /// Whether subscription timing is valid
  timing_valid: Bool,
  /// Whether tier upgrade is valid (if applicable)
  upgrade_valid: Bool,
  /// Overall validation result
  is_valid: Bool
}

/// Payment metadata that should be included in transactions
pub type PaymentMetadata {
  /// Discord user ID making the payment
  discord_user_id: ByteArray,
  /// Subscription tier being purchased
  tier: SubscriptionTier,
  /// Duration in months
  duration_months: Int,
  /// Bot version for compatibility
  bot_version: ByteArray,
  /// Optional referral code
  referral_code: Option<ByteArray>
}

// =============================================================================
// SUBSCRIPTION MANAGEMENT
// =============================================================================

/// Subscription status for tracking
pub type SubscriptionStatus {
  /// Subscription is active and valid
  Active
  /// Subscription has expired
  Expired
  /// Subscription is in grace period (can still renew)
  GracePeriod
  /// Subscription was cancelled
  Cancelled
  /// Subscription is pending payment confirmation
  Pending
}

/// Subscription benefits based on tier
pub type SubscriptionBenefits {
  /// Maximum animations per hour
  max_animations_per_hour: Int,
  /// Whether background removal is included
  background_removal: Bool,
  /// Whether premium AI models are included
  premium_models: Bool,
  /// Whether user gets priority processing
  priority_processing: Bool,
  /// Whether user gets beta features
  beta_features: Bool,
  /// Whether this applies to entire Discord server
  server_wide: Bool
}

// =============================================================================
// CONSTANTS AND PRICING
// =============================================================================

/// Subscription pricing in lovelace (1 ADA = 1,000,000 lovelace)
pub const premium_price = 5_000_000   // 5 ADA
pub const ultra_price = 10_000_000    // 10 ADA  
pub const server_price = 50_000_000   // 50 ADA

/// Time constants in milliseconds
pub const minute_ms = 60_000
pub const hour_ms = 60 * minute_ms
pub const day_ms = 24 * hour_ms
pub const month_ms = 30 * day_ms
pub const grace_period_ms = 7 * day_ms  // 7 days grace period

/// Discord user ID validation constants
pub const min_discord_id_length = 18
pub const max_discord_id_length = 19

/// Maximum subscription duration
pub const max_subscription_months = 12

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/// Get the price for a subscription tier
pub fn get_tier_price(tier: SubscriptionTier) -> Int {
  when tier is {
    Premium -> premium_price
    Ultra -> ultra_price
    Server -> server_price
  }
}

/// Get the benefits for a subscription tier
pub fn get_tier_benefits(tier: SubscriptionTier) -> SubscriptionBenefits {
  when tier is {
    Premium -> SubscriptionBenefits {
      max_animations_per_hour: 50,
      background_removal: True,
      premium_models: False,
      priority_processing: False,
      beta_features: False,
      server_wide: False
    }
    Ultra -> SubscriptionBenefits {
      max_animations_per_hour: 200,
      background_removal: True,
      premium_models: True,
      priority_processing: True,
      beta_features: True,
      server_wide: False
    }
    Server -> SubscriptionBenefits {
      max_animations_per_hour: 1000,
      background_removal: True,
      premium_models: True,
      priority_processing: True,
      beta_features: True,
      server_wide: True
    }
  }
}

/// Calculate subscription end time
pub fn calculate_end_time(start_time: Int, months: Int) -> Int {
  start_time + (months * month_ms)
}

/// Check if a tier is higher than another (for upgrades)
pub fn is_tier_upgrade(from: SubscriptionTier, to: SubscriptionTier) -> Bool {
  let from_price = get_tier_price(from)
  let to_price = get_tier_price(to)
  to_price > from_price
}

/// Get tier name as string for logging/metadata
pub fn tier_to_string(tier: SubscriptionTier) -> ByteArray {
  when tier is {
    Premium -> "Premium"
    Ultra -> "Ultra"
    Server -> "Server"
  }
}
