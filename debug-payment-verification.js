// 🔍 Debug Payment Verification System
// This script helps debug payment verification issues

const { CardanoVerifier } = require('./src/cardano-verification');
const { SubscriptionManager, PaymentVerifier } = require('./src/payment-system');
require('dotenv').config();

async function debugPaymentVerification() {
  console.log('🔍 Debugging Payment Verification System');
  console.log('========================================');

  // Check environment variables
  console.log('\n📋 Environment Check:');
  console.log('REPLICATE_API_TOKEN:', process.env.REPLICATE_API_TOKEN ? '✅ Set' : '❌ Missing');
  console.log('PAYMENT_WALLET_ADDRESS:', process.env.PAYMENT_WALLET_ADDRESS || 'Using default');
  console.log('CARDANO_NETWORK:', process.env.CARDANO_NETWORK || 'Not set');

  // Initialize systems
  const cardanoVerifier = new CardanoVerifier();
  const subscriptionManager = new SubscriptionManager();
  const paymentVerifier = new PaymentVerifier();

  // Test wallet address
  console.log('\n💰 Payment Address Check:');
  const testUserId = 'debug_user_123';
  const paymentAddress = paymentVerifier.getPaymentAddress(testUserId, 'Premium', 1);
  console.log('Payment Address:', paymentAddress);
  
  // Check if it's your wallet
  const expectedAddress = 'addr1q82j3cnhky8u0w4wa0ntsgeypraf24jxz5qr6wgwcy97u7t8pvpwk4ker5z2lmfsjlvx0y2tex68ahdwql9xkm9urxks9n2nl8';
  if (paymentAddress === expectedAddress) {
    console.log('✅ Correct wallet address configured');
  } else {
    console.log('❌ Wrong wallet address!');
    console.log('Expected:', expectedAddress);
    console.log('Got:', paymentAddress);
  }

  // Test Cardano API connectivity
  console.log('\n🔗 Cardano API Test:');
  try {
    const balance = await cardanoVerifier.getWalletBalance();
    if (balance.success) {
      console.log('✅ Cardano API working');
      console.log('Wallet Balance:', balance.balance, 'ADA');
    } else {
      console.log('❌ Cardano API failed:', balance.error);
    }
  } catch (error) {
    console.log('❌ Cardano API error:', error.message);
  }

  // Prompt for transaction hash to test
  console.log('\n🧪 Transaction Verification Test:');
  console.log('Please provide the transaction hash you tried to verify:');
  
  // For testing, let's use a mock transaction hash
  // In real usage, you'd input the actual transaction hash
  const testTxHash = process.argv[2];
  
  if (!testTxHash) {
    console.log('❌ No transaction hash provided');
    console.log('Usage: node debug-payment-verification.js [transaction_hash]');
    console.log('Example: node debug-payment-verification.js abc123def456...');
    return;
  }

  console.log('Testing transaction:', testTxHash);
  
  try {
    // Test payment verification
    const expectedAmount = 15; // Premium subscription
    const verification = await paymentVerifier.verifyPayment(testTxHash, expectedAmount, testUserId);
    
    console.log('\n📊 Verification Result:');
    console.log('Verified:', verification.verified);
    console.log('Amount:', verification.amount);
    console.log('Error:', verification.error || 'None');
    
    if (verification.verified) {
      console.log('✅ Payment verification successful!');
      
      // Test subscription creation
      console.log('\n📋 Testing Subscription Creation:');
      const subscription = subscriptionManager.createSubscription(
        testUserId,
        'Premium',
        1,
        verification.amount,
        testTxHash
      );
      
      console.log('✅ Subscription created:', subscription.tier);
      console.log('Expires:', new Date(subscription.endTime).toISOString());
      
      // Clean up test subscription
      subscriptionManager.deleteSubscription(testUserId);
      console.log('🧹 Test subscription cleaned up');
      
    } else {
      console.log('❌ Payment verification failed');
      console.log('Reason:', verification.error);
      
      // Provide debugging suggestions
      console.log('\n🔧 Debugging Suggestions:');
      console.log('1. Check if transaction is confirmed on blockchain');
      console.log('2. Verify transaction sent ADA to correct address:', paymentAddress);
      console.log('3. Check if amount matches expected amount:', expectedAmount, 'ADA');
      console.log('4. Wait a few minutes for blockchain confirmation');
      console.log('5. Check Cardano explorer: https://cardanoscan.io/transaction/' + testTxHash);
    }
    
  } catch (error) {
    console.log('❌ Verification error:', error.message);
    
    // Check for common issues
    if (error.message.includes('Authentication')) {
      console.log('🔑 Issue: API authentication failed');
      console.log('Solution: Check REPLICATE_API_TOKEN in environment');
    } else if (error.message.includes('timeout')) {
      console.log('⏰ Issue: API timeout');
      console.log('Solution: Try again in a few minutes');
    } else if (error.message.includes('not found')) {
      console.log('🔍 Issue: Transaction not found');
      console.log('Solution: Wait for blockchain confirmation or check transaction hash');
    }
  }

  // Test subscription checking
  console.log('\n📋 Subscription Status Test:');
  const userTier = subscriptionManager.getUserTier(testUserId);
  const hasActive = subscriptionManager.hasActiveSubscription(testUserId);
  console.log('User Tier:', userTier);
  console.log('Has Active Subscription:', hasActive);
}

// Additional function to check a specific transaction on Cardano explorer
async function checkTransactionOnExplorer(txHash) {
  console.log('\n🔍 Checking transaction on Cardano explorer...');
  console.log('Transaction Hash:', txHash);
  console.log('Explorer URL: https://cardanoscan.io/transaction/' + txHash);
  console.log('Check this URL to verify:');
  console.log('1. Transaction is confirmed');
  console.log('2. ADA was sent to correct address');
  console.log('3. Amount matches subscription price');
}

// Run the debug
if (require.main === module) {
  debugPaymentVerification().catch(console.error);
}
