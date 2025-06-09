// 💰 Payment System Integration for Discord Bot
// This module handles ADA payments and subscription management

const fs = require('fs');
const path = require('path');

// =============================================================================
// SUBSCRIPTION MANAGEMENT
// =============================================================================

class SubscriptionManager {
  constructor() {
    this.subscriptionsFile = path.join(__dirname, '..', 'data', 'subscriptions.json');
    this.contractAddress = null; // Will be set after deployment
    this.subscriptions = this.loadSubscriptions();
  }

  // Load subscriptions from file
  loadSubscriptions() {
    try {
      if (fs.existsSync(this.subscriptionsFile)) {
        const data = fs.readFileSync(this.subscriptionsFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading subscriptions:', error);
    }
    return {};
  }

  // Save subscriptions to file
  saveSubscriptions() {
    try {
      const dir = path.dirname(this.subscriptionsFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.subscriptionsFile, JSON.stringify(this.subscriptions, null, 2));
    } catch (error) {
      console.error('Error saving subscriptions:', error);
    }
  }

  // Get user subscription status
  getUserSubscription(discordUserId) {
    return this.subscriptions[discordUserId] || null;
  }

  // Check if user has active subscription
  hasActiveSubscription(discordUserId) {
    const subscription = this.getUserSubscription(discordUserId);
    if (!subscription) return false;
    
    const now = Date.now();
    return subscription.isActive && subscription.endTime > now;
  }

  // Get user's subscription tier
  getUserTier(discordUserId) {
    const subscription = this.getUserSubscription(discordUserId);
    if (!subscription || !this.hasActiveSubscription(discordUserId)) {
      return 'Standard';
    }
    return subscription.tier;
  }

  // Create new subscription
  createSubscription(discordUserId, tier, durationMonths, amountPaid, txHash) {
    const now = Date.now();
    const endTime = now + (durationMonths * 30 * 24 * 60 * 60 * 1000); // Approximate month

    this.subscriptions[discordUserId] = {
      tier: tier,
      startTime: now,
      endTime: endTime,
      amountPaid: amountPaid,
      durationMonths: durationMonths,
      isActive: true,
      txHash: txHash,
      createdAt: new Date().toISOString()
    };

    this.saveSubscriptions();
    return this.subscriptions[discordUserId];
  }

  // Renew existing subscription
  renewSubscription(discordUserId, durationMonths, amountPaid, txHash) {
    const subscription = this.getUserSubscription(discordUserId);
    if (!subscription) {
      throw new Error('No existing subscription found');
    }

    const now = Date.now();
    const currentEndTime = subscription.endTime;
    const newStartTime = Math.max(now, currentEndTime);
    const newEndTime = newStartTime + (durationMonths * 30 * 24 * 60 * 60 * 1000);

    subscription.endTime = newEndTime;
    subscription.amountPaid += amountPaid;
    subscription.isActive = true;
    subscription.lastRenewal = {
      txHash: txHash,
      amount: amountPaid,
      duration: durationMonths,
      renewedAt: new Date().toISOString()
    };

    this.saveSubscriptions();
    return subscription;
  }

  // Upgrade subscription tier
  upgradeSubscription(discordUserId, newTier, amountPaid, txHash) {
    const subscription = this.getUserSubscription(discordUserId);
    if (!subscription) {
      throw new Error('No existing subscription found');
    }

    subscription.tier = newTier;
    subscription.amountPaid += amountPaid;
    subscription.lastUpgrade = {
      txHash: txHash,
      amount: amountPaid,
      newTier: newTier,
      upgradedAt: new Date().toISOString()
    };

    this.saveSubscriptions();
    return subscription;
  }

  // Get subscription statistics
  getStats() {
    const subscriptions = Object.values(this.subscriptions);
    const activeSubscriptions = subscriptions.filter(sub => 
      sub.isActive && sub.endTime > Date.now()
    );

    const tierCounts = {
      Premium: 0,
      Ultra: 0,
      Server: 0
    };

    activeSubscriptions.forEach(sub => {
      tierCounts[sub.tier] = (tierCounts[sub.tier] || 0) + 1;
    });

    return {
      totalSubscriptions: subscriptions.length,
      activeSubscriptions: activeSubscriptions.length,
      tierCounts: tierCounts,
      totalRevenue: subscriptions.reduce((sum, sub) => sum + (sub.amountPaid || 0), 0)
    };
  }
}

// =============================================================================
// PAYMENT VERIFICATION
// =============================================================================

class PaymentVerifier {
  constructor() {
    this.contractAddress = null;
  }

  // Set contract address after deployment
  setContractAddress(address) {
    this.contractAddress = address;
    console.log(`💰 Contract address set: ${address}`);
  }

  // Verify payment transaction (simplified for now)
  async verifyPayment(txHash, expectedAmount, discordUserId) {
    try {
      // TODO: Implement actual Cardano transaction verification
      // For now, we'll simulate verification
      console.log(`🔍 Verifying payment: ${txHash}`);
      console.log(`💰 Expected amount: ${expectedAmount} ADA`);
      console.log(`👤 User: ${discordUserId}`);

      // Simulate verification delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // For development, always return success
      // In production, this would check the actual blockchain
      return {
        verified: true,
        amount: expectedAmount,
        txHash: txHash,
        blockHeight: Math.floor(Math.random() * 1000000),
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Payment verification error:', error);
      return {
        verified: false,
        error: error.message
      };
    }
  }

  // Get payment address for user
  getPaymentAddress(discordUserId, tier, duration) {
    // TODO: Generate unique payment address or use contract address
    // For now, return the contract address
    return this.contractAddress || 'addr_test1_placeholder';
  }
}

// =============================================================================
// TIER PRICING
// =============================================================================

const TIER_PRICING = {
  Premium: {
    monthly: 15, // ADA per month
    features: [
      '50 animations per hour',
      'Premium quality models',
      'Priority processing',
      'Background removal included'
    ]
  },
  Ultra: {
    monthly: 25, // ADA per month
    features: [
      'Unlimited animations',
      'Ultra quality models',
      'Instant processing',
      'All premium features',
      'Beta feature access'
    ]
  },
  Server: {
    monthly: 100, // ADA per month
    features: [
      'Server-wide premium access',
      'All ultra features',
      'Custom branding',
      'Priority support',
      'Analytics dashboard'
    ]
  }
};

// Calculate payment amount
function calculatePaymentAmount(tier, durationMonths) {
  const tierPrice = TIER_PRICING[tier];
  if (!tierPrice) {
    throw new Error(`Invalid tier: ${tier}`);
  }
  return tierPrice.monthly * durationMonths;
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  SubscriptionManager,
  PaymentVerifier,
  TIER_PRICING,
  calculatePaymentAmount
};
