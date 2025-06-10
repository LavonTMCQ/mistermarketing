// 💳 Discord Payment Commands for ADA Subscriptions
// These commands handle subscription management and payments

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { SubscriptionManager, PaymentVerifier, TIER_PRICING, calculatePaymentAmount } = require('../payment-system');
const { ServerManager } = require('../server-management');

// Initialize payment system
const subscriptionManager = new SubscriptionManager();
const paymentVerifier = new PaymentVerifier();
let serverManager = null; // Will be initialized when client is available

// =============================================================================
// SUBSCRIBE COMMAND
// =============================================================================

const subscribeCommand = {
  data: new SlashCommandBuilder()
    .setName('subscribe')
    .setDescription('Subscribe to premium features with ADA payments')
    .addStringOption(option =>
      option.setName('tier')
        .setDescription('Subscription tier')
        .setRequired(true)
        .addChoices(
          { name: 'Premium - 15 ADA/month', value: 'Premium' },
          { name: 'Ultra - 25 ADA/month', value: 'Ultra' },
          { name: 'Server - 100 ADA/month', value: 'Server' }
        ))
    .addIntegerOption(option =>
      option.setName('duration')
        .setDescription('Duration in months')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(12)),

  async execute(interaction) {
    try {
      const tier = interaction.options.getString('tier');
      const duration = interaction.options.getInteger('duration');
      const userId = interaction.user.id;

      // Check if user already has active subscription
      const existingSubscription = subscriptionManager.getUserSubscription(userId);
      if (existingSubscription && subscriptionManager.hasActiveSubscription(userId)) {
        const embed = new EmbedBuilder()
          .setColor('#ff6b6b')
          .setTitle('❌ Already Subscribed')
          .setDescription(`You already have an active **${existingSubscription.tier}** subscription.`)
          .addFields(
            { name: 'Current Tier', value: existingSubscription.tier, inline: true },
            { name: 'Expires', value: `<t:${Math.floor(existingSubscription.endTime / 1000)}:R>`, inline: true }
          )
          .setFooter({ text: 'Use /renew to extend or /upgrade to change tiers' });

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      // Calculate payment amount
      const paymentAmount = calculatePaymentAmount(tier, duration);
      const tierInfo = TIER_PRICING[tier];

      // Get payment address
      const paymentAddress = paymentVerifier.getPaymentAddress(userId, tier, duration);

      // Create subscription embed
      const embed = new EmbedBuilder()
        .setColor('#4ecdc4')
        .setTitle('💰 ADA Payment Required')
        .setDescription(`To activate your **${tier}** subscription, send **${paymentAmount} ADA** to the address below.`)
        .addFields(
          { name: '💳 Payment Address', value: `\`${paymentAddress}\``, inline: false },
          { name: '💰 Amount', value: `${paymentAmount} ADA`, inline: true },
          { name: '⏱️ Duration', value: `${duration} month${duration > 1 ? 's' : ''}`, inline: true },
          { name: '🎯 Tier', value: tier, inline: true },
          { name: '✨ Features', value: tierInfo.features.map(f => `• ${f}`).join('\n'), inline: false }
        )
        .setFooter({ text: 'After payment, use /verify-payment with your transaction hash' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });

      // Log the subscription request
      console.log(`💰 Subscription request: ${userId} -> ${tier} for ${duration} months (${paymentAmount} ADA)`);

    } catch (error) {
      console.error('Subscribe command error:', error);
      await interaction.reply({
        content: '❌ An error occurred while processing your subscription request.',
        ephemeral: true
      });
    }
  }
};

// =============================================================================
// VERIFY PAYMENT COMMAND
// =============================================================================

const verifyPaymentCommand = {
  data: new SlashCommandBuilder()
    .setName('verify-payment')
    .setDescription('Verify your ADA payment and activate subscription')
    .addStringOption(option =>
      option.setName('transaction_hash')
        .setDescription('Your Cardano transaction hash')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('tier')
        .setDescription('Subscription tier you paid for')
        .setRequired(true)
        .addChoices(
          { name: 'Premium', value: 'Premium' },
          { name: 'Ultra', value: 'Ultra' },
          { name: 'Server', value: 'Server' }
        ))
    .addIntegerOption(option =>
      option.setName('duration')
        .setDescription('Duration in months you paid for')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(12)),

  async execute(interaction) {
    try {
      const txHash = interaction.options.getString('transaction_hash');
      const tier = interaction.options.getString('tier');
      const duration = interaction.options.getInteger('duration');
      const userId = interaction.user.id;

      await interaction.deferReply({ ephemeral: true });

      // Calculate expected payment amount
      const expectedAmount = calculatePaymentAmount(tier, duration);

      // Verify the payment
      const verification = await paymentVerifier.verifyPayment(txHash, expectedAmount, userId);

      if (!verification.verified) {
        const embed = new EmbedBuilder()
          .setColor('#ff6b6b')
          .setTitle('❌ Payment Verification Failed')
          .setDescription('We could not verify your payment. Please check your transaction hash and try again.')
          .addFields(
            { name: 'Transaction Hash', value: `\`${txHash}\``, inline: false },
            { name: 'Error', value: verification.error || 'Unknown error', inline: false }
          )
          .setFooter({ text: 'Contact support if you believe this is an error' });

        return interaction.editReply({ embeds: [embed] });
      }

      // Handle different subscription types
      let subscription;
      let embed;

      if (tier === 'Server') {
        // Server subscription - create server subscription and provide invite link
        if (!serverManager) {
          serverManager = new ServerManager(interaction.client);
        }

        // For server subscriptions, we need to handle the invite process
        subscription = {
          userId: userId,
          tier: tier,
          duration: duration,
          amountPaid: verification.amount,
          txHash: txHash,
          startTime: Date.now(),
          endTime: Date.now() + (duration * 30 * 24 * 60 * 60 * 1000)
        };

        // Generate server invite
        const inviteInfo = await serverManager.generateServerInvite(userId, tier, duration);

        embed = new EmbedBuilder()
          .setColor('#4ecdc4')
          .setTitle('🏢 Server Subscription Activated!')
          .setDescription('Your server subscription is ready! Follow the steps below to add the bot to your server.')
          .addFields(
            { name: '🎯 Subscription Details', value: `**Tier:** ${tier}\n**Duration:** ${duration} month${duration > 1 ? 's' : ''}\n**Amount Paid:** ${verification.amount} ADA`, inline: false },
            { name: '🔗 Step 1: Invite Bot to Your Server', value: `[Click here to invite the bot](${inviteInfo.inviteUrl})`, inline: false },
            { name: '⚡ Step 2: Authorize Permissions', value: 'Select your server and authorize the required permissions', inline: false },
            { name: '🎉 Step 3: Enjoy Unlimited Access', value: 'All server members will have unlimited animations!', inline: false },
            { name: '📅 Expires', value: `<t:${Math.floor(subscription.endTime / 1000)}:F>`, inline: false },
            { name: '🔗 Transaction', value: `\`${txHash}\``, inline: false }
          )
          .setFooter({ text: 'The bot will automatically detect your server subscription when it joins!' })
          .setTimestamp();

        // Store the pending server subscription (will be activated when bot joins the server)
        // We'll store it with a temporary guild ID that gets updated when the bot joins
        const tempGuildId = `pending_${userId}_${Date.now()}`;
        serverManager.serverSubscriptions[tempGuildId] = subscription;
        serverManager.saveServerSubscriptions();

      } else {
        // Personal subscription (Premium/Ultra)
        subscription = subscriptionManager.createSubscription(
          userId,
          tier,
          duration,
          verification.amount,
          txHash
        );

        embed = new EmbedBuilder()
          .setColor('#4ecdc4')
          .setTitle('🎉 Personal Subscription Activated!')
          .setDescription(`Your **${tier}** subscription has been successfully activated!`)
          .addFields(
            { name: '🎯 Tier', value: tier, inline: true },
            { name: '⏱️ Duration', value: `${duration} month${duration > 1 ? 's' : ''}`, inline: true },
            { name: '💰 Amount Paid', value: `${verification.amount} ADA`, inline: true },
            { name: '📅 Expires', value: `<t:${Math.floor(subscription.endTime / 1000)}:F>`, inline: false },
            { name: '✨ Features', value: tier === 'Ultra' ? 'Unlimited animations across all servers!' : '50 animations per hour across all servers!', inline: false },
            { name: '🔗 Transaction', value: `\`${txHash}\``, inline: false }
          )
          .setFooter({ text: 'Thank you for supporting Stickerize Bot!' })
          .setTimestamp();
      }

      await interaction.editReply({ embeds: [embed] });

      // Log the successful subscription
      console.log(`✅ Subscription activated: ${userId} -> ${tier} (${txHash})`);

    } catch (error) {
      console.error('Verify payment command error:', error);
      await interaction.editReply({
        content: '❌ An error occurred while verifying your payment.'
      });
    }
  }
};

// =============================================================================
// SUBSCRIPTION STATUS COMMAND
// =============================================================================

const statusCommand = {
  data: new SlashCommandBuilder()
    .setName('subscription')
    .setDescription('Check your subscription status'),

  async execute(interaction) {
    try {
      const userId = interaction.user.id;
      const subscription = subscriptionManager.getUserSubscription(userId);

      if (!subscription) {
        const embed = new EmbedBuilder()
          .setColor('#ffa726')
          .setTitle('📋 No Subscription')
          .setDescription('You don\'t have any subscription yet.')
          .addFields(
            { name: '🆓 Current Tier', value: 'Standard (Free)', inline: true },
            { name: '⚡ Rate Limit', value: '10 animations/hour', inline: true }
          )
          .setFooter({ text: 'Use /subscribe to upgrade to premium features!' });

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const isActive = subscriptionManager.hasActiveSubscription(userId);
      const tierInfo = TIER_PRICING[subscription.tier];

      const embed = new EmbedBuilder()
        .setColor(isActive ? '#4ecdc4' : '#ff6b6b')
        .setTitle(`📋 Subscription Status`)
        .setDescription(`Your subscription details:`)
        .addFields(
          { name: '🎯 Tier', value: subscription.tier, inline: true },
          { name: '📊 Status', value: isActive ? '✅ Active' : '❌ Expired', inline: true },
          { name: '💰 Amount Paid', value: `${subscription.amountPaid} ADA`, inline: true },
          { name: '📅 Started', value: `<t:${Math.floor(subscription.startTime / 1000)}:F>`, inline: true },
          { name: '📅 Expires', value: `<t:${Math.floor(subscription.endTime / 1000)}:F>`, inline: true },
          { name: '⏱️ Time Left', value: isActive ? `<t:${Math.floor(subscription.endTime / 1000)}:R>` : 'Expired', inline: true }
        );

      if (tierInfo) {
        embed.addFields(
          { name: '✨ Features', value: tierInfo.features.map(f => `• ${f}`).join('\n'), inline: false }
        );
      }

      if (!isActive) {
        embed.setFooter({ text: 'Use /renew to reactivate your subscription' });
      }

      await interaction.reply({ embeds: [embed], ephemeral: true });

    } catch (error) {
      console.error('Status command error:', error);
      await interaction.reply({
        content: '❌ An error occurred while checking your subscription status.',
        ephemeral: true
      });
    }
  }
};

// =============================================================================
// SERVER STATUS COMMAND
// =============================================================================

const serverStatusCommand = {
  data: new SlashCommandBuilder()
    .setName('server-status')
    .setDescription('Check server subscription status (admin only)'),

  async execute(interaction) {
    try {
      // Check if user has admin permissions
      if (!interaction.member.permissions.has('Administrator')) {
        return interaction.reply({
          content: '❌ You need Administrator permissions to check server subscription status.',
          ephemeral: true
        });
      }

      const guildId = interaction.guildId;
      if (!serverManager) {
        serverManager = new ServerManager(interaction.client);
      }

      const serverSubscription = serverManager.getServerSubscription(guildId);
      const hasActive = serverManager.hasActiveServerSubscription(guildId);

      if (!serverSubscription) {
        const embed = new EmbedBuilder()
          .setColor('#ffa726')
          .setTitle('🏢 No Server Subscription')
          .setDescription('This server doesn\'t have a subscription.')
          .addFields(
            { name: '🆓 Current Status', value: 'Standard (Free)', inline: true },
            { name: '⚡ Rate Limit', value: '10 animations/hour per user', inline: true },
            { name: '💎 Upgrade Server', value: 'Use `/subscribe Server 1` to get unlimited access for all members!\n**Cost**: 100 ADA/month', inline: false }
          )
          .setFooter({ text: 'Server subscriptions provide unlimited access for ALL members' });

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setColor(hasActive ? '#4ecdc4' : '#ff6b6b')
        .setTitle('🏢 Server Subscription Status')
        .setDescription(`Server subscription details:`)
        .addFields(
          { name: '🎯 Tier', value: serverSubscription.tier, inline: true },
          { name: '📊 Status', value: hasActive ? '✅ Active' : '❌ Expired', inline: true },
          { name: '💰 Amount Paid', value: `${serverSubscription.amountPaid} ADA`, inline: true },
          { name: '👤 Purchased By', value: `<@${serverSubscription.userId}>`, inline: true },
          { name: '📅 Started', value: `<t:${Math.floor(serverSubscription.startTime / 1000)}:F>`, inline: true },
          { name: '📅 Expires', value: `<t:${Math.floor(serverSubscription.endTime / 1000)}:F>`, inline: true },
          { name: '⏱️ Time Left', value: hasActive ? `<t:${Math.floor(serverSubscription.endTime / 1000)}:R>` : 'Expired', inline: true },
          { name: '✨ Benefits', value: hasActive ? 'All members have unlimited animations!' : 'Members have individual rate limits', inline: false }
        );

      if (!hasActive) {
        embed.addFields(
          { name: '🔄 Renew Subscription', value: 'Use `/subscribe Server 1` to renew for 100 ADA/month', inline: false }
        );
        embed.setFooter({ text: 'Renew to restore unlimited access for all members' });
      } else {
        embed.setFooter({ text: 'Thank you for supporting Stickerize Bot!' });
      }

      await interaction.reply({ embeds: [embed], ephemeral: true });

    } catch (error) {
      console.error('Server status command error:', error);
      await interaction.reply({
        content: '❌ An error occurred while checking server subscription status.',
        ephemeral: true
      });
    }
  }
};

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  subscribeCommand,
  verifyPaymentCommand,
  statusCommand,
  serverStatusCommand,
  subscriptionManager,
  paymentVerifier
};
