// 🏢 Server Management System
// Handles server invitations, access control, and subscription management

const fs = require('fs');
const path = require('path');
const { Client, EmbedBuilder, PermissionsBitField } = require('discord.js');

// Server subscriptions storage
const SERVER_SUBSCRIPTIONS_FILE = path.join(__dirname, '../data/server-subscriptions.json');

class ServerManager {
  constructor(client) {
    this.client = client;
    this.serverSubscriptions = this.loadServerSubscriptions();
  }

  // Load server subscriptions from file
  loadServerSubscriptions() {
    try {
      if (fs.existsSync(SERVER_SUBSCRIPTIONS_FILE)) {
        const data = fs.readFileSync(SERVER_SUBSCRIPTIONS_FILE, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading server subscriptions:', error);
    }
    return {};
  }

  // Save server subscriptions to file
  saveServerSubscriptions() {
    try {
      const dir = path.dirname(SERVER_SUBSCRIPTIONS_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(SERVER_SUBSCRIPTIONS_FILE, JSON.stringify(this.serverSubscriptions, null, 2));
    } catch (error) {
      console.error('Error saving server subscriptions:', error);
    }
  }

  // Create server subscription after payment verification
  createServerSubscription(userId, guildId, tier, duration, amountPaid, txHash) {
    const now = Date.now();
    const endTime = now + (duration * 30 * 24 * 60 * 60 * 1000); // duration in months

    const subscription = {
      userId: userId,
      guildId: guildId,
      tier: tier,
      duration: duration,
      amountPaid: amountPaid,
      txHash: txHash,
      startTime: now,
      endTime: endTime,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    this.serverSubscriptions[guildId] = subscription;
    this.saveServerSubscriptions();

    console.log(`✅ Server subscription created: ${guildId} -> ${tier} (${duration} months)`);
    return subscription;
  }

  // Check if server has active subscription
  hasActiveServerSubscription(guildId) {
    const subscription = this.serverSubscriptions[guildId];
    if (!subscription) return false;

    const now = Date.now();
    const isActive = subscription.status === 'active' && now < subscription.endTime;

    // Auto-expire if time is up
    if (!isActive && subscription.status === 'active') {
      this.expireServerSubscription(guildId);
    }

    return isActive;
  }

  // Get server subscription details
  getServerSubscription(guildId) {
    return this.serverSubscriptions[guildId] || null;
  }

  // Expire server subscription
  expireServerSubscription(guildId) {
    if (this.serverSubscriptions[guildId]) {
      this.serverSubscriptions[guildId].status = 'expired';
      this.saveServerSubscriptions();
      console.log(`⏰ Server subscription expired: ${guildId}`);
      
      // Notify server about expiration
      this.notifyServerExpiration(guildId);
    }
  }

  // Generate server invitation link
  async generateServerInvite(userId, tier, duration) {
    try {
      // Create invite link with specific permissions for the bot
      const permissions = new PermissionsBitField([
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.UseSlashCommands,
        PermissionsBitField.Flags.AttachFiles,
        PermissionsBitField.Flags.EmbedLinks,
        PermissionsBitField.Flags.ReadMessageHistory,
        PermissionsBitField.Flags.ViewChannel
      ]);

      const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&permissions=${permissions.bitfield}&scope=bot%20applications.commands`;

      return {
        inviteUrl: inviteUrl,
        instructions: `
**🎉 Server Subscription Activated!**

**Step 1:** Click the link below to invite the bot to your server
**Step 2:** Select your server and authorize the bot
**Step 3:** The bot will automatically detect your server subscription

**Invite Link:** ${inviteUrl}

**Your Subscription:**
• **Tier:** ${tier}
• **Duration:** ${duration} month${duration > 1 ? 's' : ''}
• **Features:** Unlimited animations for all server members
• **Expires:** <t:${Math.floor((Date.now() + duration * 30 * 24 * 60 * 60 * 1000) / 1000)}:F>
        `
      };
    } catch (error) {
      console.error('Error generating server invite:', error);
      throw error;
    }
  }

  // Handle bot joining a new server
  async handleServerJoin(guild) {
    try {
      console.log(`🏢 Bot joined server: ${guild.name} (${guild.id})`);

      // Check if this server has a subscription
      const subscription = this.getServerSubscription(guild.id);
      
      if (subscription && this.hasActiveServerSubscription(guild.id)) {
        // Server has active subscription
        await this.welcomeSubscribedServer(guild, subscription);
      } else {
        // Server doesn't have subscription
        await this.welcomeNewServer(guild);
      }
    } catch (error) {
      console.error('Error handling server join:', error);
    }
  }

  // Welcome message for subscribed servers
  async welcomeSubscribedServer(guild, subscription) {
    try {
      // Find a channel to send welcome message
      const channel = guild.systemChannel || 
                     guild.channels.cache.find(ch => ch.type === 0 && ch.permissionsFor(guild.members.me).has('SendMessages'));

      if (channel) {
        const embed = new EmbedBuilder()
          .setColor('#4ecdc4')
          .setTitle('🎉 Stickerize Bot - Server Subscription Active!')
          .setDescription('Welcome to your premium Stickerize Bot experience!')
          .addFields(
            { name: '🎯 Subscription Tier', value: subscription.tier, inline: true },
            { name: '⏰ Expires', value: `<t:${Math.floor(subscription.endTime / 1000)}:R>`, inline: true },
            { name: '✨ Features', value: '• Unlimited animations for all members\n• Priority processing\n• All animation styles\n• Background removal', inline: false },
            { name: '🚀 Get Started', value: 'Use `/stickerize` to create animated stickers!', inline: false }
          )
          .setFooter({ text: 'Thank you for supporting Stickerize Bot with ADA!' })
          .setTimestamp();

        await channel.send({ embeds: [embed] });
      }
    } catch (error) {
      console.error('Error sending welcome message to subscribed server:', error);
    }
  }

  // Welcome message for new servers (no subscription)
  async welcomeNewServer(guild) {
    try {
      const channel = guild.systemChannel || 
                     guild.channels.cache.find(ch => ch.type === 0 && ch.permissionsFor(guild.members.me).has('SendMessages'));

      if (channel) {
        const embed = new EmbedBuilder()
          .setColor('#ffa726')
          .setTitle('👋 Welcome to Stickerize Bot!')
          .setDescription('Thanks for adding me to your server!')
          .addFields(
            { name: '🆓 Free Features', value: '• 10 animations per hour per user\n• Basic animation styles\n• Standard quality', inline: false },
            { name: '💎 Server Subscription', value: '• **100 ADA/month** for unlimited server-wide access\n• All members get unlimited animations\n• Premium features and priority processing', inline: false },
            { name: '🚀 Get Started', value: 'Use `/stickerize` to create your first animated sticker!\nUse `/subscribe Server 1` to upgrade your entire server!', inline: false }
          )
          .setFooter({ text: 'Powered by Cardano blockchain payments' })
          .setTimestamp();

        await channel.send({ embeds: [embed] });
      }
    } catch (error) {
      console.error('Error sending welcome message to new server:', error);
    }
  }

  // Notify server about subscription expiration
  async notifyServerExpiration(guildId) {
    try {
      const guild = this.client.guilds.cache.get(guildId);
      if (!guild) return;

      const channel = guild.systemChannel || 
                     guild.channels.cache.find(ch => ch.type === 0 && ch.permissionsFor(guild.members.me).has('SendMessages'));

      if (channel) {
        const embed = new EmbedBuilder()
          .setColor('#ff6b6b')
          .setTitle('⏰ Server Subscription Expired')
          .setDescription('Your server subscription has expired.')
          .addFields(
            { name: '📉 What Changes', value: '• Members now have individual rate limits (10/hour)\n• Premium features disabled\n• Standard quality only', inline: false },
            { name: '🔄 Renew Subscription', value: 'Use `/subscribe Server 1` to renew your server subscription for 100 ADA/month', inline: false },
            { name: '💰 Payment', value: 'Send ADA to renew and restore unlimited access for all members', inline: false }
          )
          .setFooter({ text: 'Thank you for using Stickerize Bot!' })
          .setTimestamp();

        await channel.send({ embeds: [embed] });
      }
    } catch (error) {
      console.error('Error notifying server expiration:', error);
    }
  }

  // Check if user should have unlimited access (either personal subscription or server subscription)
  shouldHaveUnlimitedAccess(userId, guildId) {
    // Check personal subscription first
    const { subscriptionManager } = require('./payment-system');
    if (subscriptionManager.hasActiveSubscription(userId)) {
      const userTier = subscriptionManager.getUserTier(userId);
      if (userTier === 'Ultra' || userTier === 'Premium') {
        return true;
      }
    }

    // Check server subscription
    if (guildId && this.hasActiveServerSubscription(guildId)) {
      return true;
    }

    return false;
  }

  // Get effective user tier (considering both personal and server subscriptions)
  getEffectiveUserTier(userId, guildId) {
    // Check personal subscription first
    const { subscriptionManager } = require('./payment-system');
    if (subscriptionManager.hasActiveSubscription(userId)) {
      return subscriptionManager.getUserTier(userId);
    }

    // Check server subscription
    if (guildId && this.hasActiveServerSubscription(guildId)) {
      return 'Server';
    }

    return 'Standard';
  }

  // Get all active server subscriptions (for monitoring)
  getActiveServerSubscriptions() {
    const active = {};
    const now = Date.now();

    for (const [guildId, subscription] of Object.entries(this.serverSubscriptions)) {
      if (subscription.status === 'active' && now < subscription.endTime) {
        active[guildId] = subscription;
      }
    }

    return active;
  }

  // Get subscription statistics
  getSubscriptionStats() {
    const now = Date.now();
    let active = 0;
    let expired = 0;
    let totalRevenue = 0;

    for (const subscription of Object.values(this.serverSubscriptions)) {
      if (subscription.status === 'active' && now < subscription.endTime) {
        active++;
      } else {
        expired++;
      }
      totalRevenue += subscription.amountPaid || 0;
    }

    return {
      activeServers: active,
      expiredServers: expired,
      totalServers: active + expired,
      totalRevenue: totalRevenue
    };
  }
}

module.exports = {
  ServerManager
};
