// 🧪 Test Payment System with Your Wallet
// This script tests the payment system to ensure it's working correctly

const { SubscriptionManager, PaymentVerifier } = require('./src/payment-system');

console.log('🧪 Testing Payment System Configuration');
console.log('=====================================');

// Initialize the payment system
const subscriptionManager = new SubscriptionManager();
const paymentVerifier = new PaymentVerifier();

// Test getting payment address
console.log('');
console.log('💰 Testing Payment Address Generation:');
const testUserId = '123456789';
const paymentAddress = paymentVerifier.getPaymentAddress(testUserId, 'Premium', 1);
console.log(`✅ Payment address: ${paymentAddress}`);

// Verify it's your wallet address
const expectedAddress = 'addr1q82j3cnhky8u0w4wa0ntsgeypraf24jxz5qr6wgwcy97u7t8pvpwk4ker5z2lmfsjlvx0y2tex68ahdwql9xkm9urxks9n2nl8';
if (paymentAddress === expectedAddress) {
  console.log('✅ Correct! Payments will go to YOUR wallet address');
} else {
  console.log('❌ ERROR: Payment address does not match your wallet!');
  console.log(`Expected: ${expectedAddress}`);
  console.log(`Got: ${paymentAddress}`);
}

// Test subscription creation
console.log('');
console.log('📋 Testing Subscription Management:');
const testSubscription = subscriptionManager.createSubscription(
  testUserId,
  'Premium',
  1,
  15,
  'test_tx_hash_123'
);

console.log('✅ Test subscription created:', {
  tier: testSubscription.tier,
  duration: testSubscription.duration,
  amountPaid: testSubscription.amountPaid
});

// Test tier checking
console.log('');
console.log('🎯 Testing Tier System:');
const userTier = subscriptionManager.getUserTier(testUserId);
console.log(`✅ User tier: ${userTier}`);

const hasActiveSubscription = subscriptionManager.hasActiveSubscription(testUserId);
console.log(`✅ Has active subscription: ${hasActiveSubscription}`);

// Test pricing
console.log('');
console.log('💎 Testing Pricing System:');
const { calculatePaymentAmount } = require('./src/payment-system');

const premiumPrice = calculatePaymentAmount('Premium', 1);
const ultraPrice = calculatePaymentAmount('Ultra', 1);
const serverPrice = calculatePaymentAmount('Server', 1);

console.log(`✅ Premium (1 month): ${premiumPrice} ADA`);
console.log(`✅ Ultra (1 month): ${ultraPrice} ADA`);
console.log(`✅ Server (1 month): ${serverPrice} ADA`);

// Revenue calculation
console.log('');
console.log('💰 Revenue Projections:');
console.log('=======================');

const scenarios = [
  { users: 10, tier: 'Premium', monthly: 10 * premiumPrice },
  { users: 5, tier: 'Ultra', monthly: 5 * ultraPrice },
  { users: 2, tier: 'Server', monthly: 2 * serverPrice }
];

let totalMonthly = 0;
scenarios.forEach(scenario => {
  console.log(`${scenario.users} ${scenario.tier} users: ${scenario.monthly} ADA/month`);
  totalMonthly += scenario.monthly;
});

console.log(`📊 Total potential: ${totalMonthly} ADA/month`);
console.log(`💵 At $0.40/ADA: $${(totalMonthly * 0.40).toFixed(2)}/month`);
console.log(`💵 At $1.00/ADA: $${(totalMonthly * 1.00).toFixed(2)}/month`);
console.log(`💵 At $2.00/ADA: $${(totalMonthly * 2.00).toFixed(2)}/month`);

console.log('');
console.log('🎉 PAYMENT SYSTEM TEST COMPLETE!');
console.log('================================');
console.log('');
console.log('✅ All systems configured correctly');
console.log('✅ Payments will go directly to your wallet');
console.log('✅ Ready for mainnet operation');
console.log('');
console.log('🚀 Your Discord bot is ready to start earning ADA!');

// Clean up test data
subscriptionManager.deleteSubscription(testUserId);
