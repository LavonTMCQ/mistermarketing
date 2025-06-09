// 💰 Simple Payment Validator for Discord Bot Subscriptions
// This is a minimal smart contract that validates ADA payments for Discord premium features

// Simple data types
pub type SubscriptionTier {
  Premium
  Ultra
  Server
}

pub type PaymentData {
  discord_user_id: ByteArray,
  tier: SubscriptionTier,
  amount_paid: Int,
  duration_months: Int
}

// Simple validator that always succeeds for now (we'll add logic later)
validator simple_payment_validator {
  spend(
    datum: Option<PaymentData>,
    _redeemer: ByteArray,
    _output_reference,
    _ctx
  ) {
    // For now, just validate that we have payment data and amount is positive
    when datum is {
      Some(payment_data) -> payment_data.amount_paid > 0
      None -> False
    }
  }
}
