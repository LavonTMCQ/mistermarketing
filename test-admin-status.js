// 🔍 Test Admin Status and Tier System
require('dotenv').config();

const { SubscriptionManager } = require('./src/payment-system');

async function testAdminStatus() {
  console.log('🔍 Testing Admin Status and Tier System');
  console.log('=====================================');
  
  const adminUserId = process.env.ADMIN_USER_ID;
  const vipChannelId = process.env.VIP_CHANNEL_ID;
  
  console.log(`👑 Admin User ID: ${adminUserId}`);
  console.log(`⭐ VIP Channel ID: ${vipChannelId}`);
  
  // Test subscription manager
  const subscriptionManager = new SubscriptionManager();
  
  // Check current tier
  const currentTier = subscriptionManager.getUserTier(adminUserId);
  console.log(`📊 Current tier for admin: ${currentTier}`);
  
  // Manually create a Premium subscription for admin
  console.log('\n🔧 Creating Premium subscription for admin...');
  
  const subscription = subscriptionManager.createSubscription(
    adminUserId,
    'Premium',
    12, // 12 months
    180, // 15 ADA * 12 months
    'admin_manual_grant'
  );
  
  console.log('✅ Subscription created:', subscription);
  
  // Check tier again
  const newTier = subscriptionManager.getUserTier(adminUserId);
  console.log(`📊 New tier for admin: ${newTier}`);
  
  // Test effective tier function
  const { getEffectiveUserTier } = require('./src/logging-bot');
  
  const effectiveTier = getEffectiveUserTier(adminUserId, 'test_guild', 'test_channel');
  console.log(`🎯 Effective tier for admin: ${effectiveTier}`);
  
  const effectiveTierVIP = getEffectiveUserTier('random_user', 'test_guild', vipChannelId);
  console.log(`🎯 Effective tier in VIP channel: ${effectiveTierVIP}`);
  
  console.log('\n✅ Admin status test complete!');
}

testAdminStatus().catch(console.error);
