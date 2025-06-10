// 🔧 Admin Commands for Manual Payment Management
// These commands help debug and manually manage payments

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { SubscriptionManager } = require('./payment-system');
const { CardanoVerifier } = require('./cardano-verification');

// Your Discord user ID (replace with your actual Discord user ID)
const ADMIN_USER_ID = process.env.ADMIN_USER_ID || 'YOUR_DISCORD_USER_ID';

// Initialize systems
const subscriptionManager = new SubscriptionManager();
const cardanoVerifier = new CardanoVerifier();

// =============================================================================
// MANUAL VERIFY COMMAND (Admin Only)
// =============================================================================

const manualVerifyCommand = {
  data: new SlashCommandBuilder()
    .setName('admin-verify')
    .setDescription('Manually verify a payment (admin only)')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to grant subscription to')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('tier')
        .setDescription('Subscription tier')
        .setRequired(true)
        .addChoices(
          { name: 'Premium', value: 'Premium' },
          { name: 'Server', value: 'Server' }
        ))
    .addIntegerOption(option =>
      option.setName('duration')
        .setDescription('Duration in months')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(12))
    .addStringOption(option =>
      option.setName('transaction_hash')
        .setDescription('Transaction hash (optional for manual override)')
        .setRequired(false)),

  async execute(interaction) {
    try {
      // Check if user is admin
      if (interaction.user.id !== ADMIN_USER_ID) {
        return interaction.reply({
          content: '❌ This command is only available to administrators.',
          ephemeral: true
        });
      }

      const targetUser = interaction.options.getUser('user');
      const tier = interaction.options.getString('tier');
      const duration = interaction.options.getInteger('duration');
      const txHash = interaction.options.getString('transaction_hash') || `manual_${Date.now()}`;

      await interaction.deferReply({ ephemeral: true });

      // Calculate expected amount
      const { calculatePaymentAmount } = require('./payment-system');
      const expectedAmount = calculatePaymentAmount(tier, duration);

      // Create subscription manually
      const subscription = subscriptionManager.createSubscription(
        targetUser.id,
        tier,
        duration,
        expectedAmount,
        txHash
      );

      const embed = new EmbedBuilder()
        .setColor('#4ecdc4')
        .setTitle('✅ Manual Payment Verification Complete')
        .setDescription(`Subscription manually granted to ${targetUser.username}`)
        .addFields(
          { name: '👤 User', value: `<@${targetUser.id}>`, inline: true },
          { name: '🎯 Tier', value: tier, inline: true },
          { name: '⏱️ Duration', value: `${duration} month${duration > 1 ? 's' : ''}`, inline: true },
          { name: '💰 Amount', value: `${expectedAmount} ADA`, inline: true },
          { name: '📅 Expires', value: `<t:${Math.floor(subscription.endTime / 1000)}:F>`, inline: true },
          { name: '🔗 Transaction', value: `\`${txHash}\``, inline: false }
        )
        .setFooter({ text: 'Manual verification by admin' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

      // Log the manual verification
      console.log(`🔧 Manual verification by admin ${interaction.user.id}: ${targetUser.id} -> ${tier} (${duration} months)`);

    } catch (error) {
      console.error('Manual verify command error:', error);
      await interaction.editReply({
        content: '❌ An error occurred during manual verification.'
      });
    }
  }
};

// =============================================================================
// DEBUG TRANSACTION COMMAND (Admin Only)
// =============================================================================

const debugTransactionCommand = {
  data: new SlashCommandBuilder()
    .setName('admin-debug-tx')
    .setDescription('Debug a transaction hash (admin only)')
    .addStringOption(option =>
      option.setName('transaction_hash')
        .setDescription('Transaction hash to debug')
        .setRequired(true))
    .addNumberOption(option =>
      option.setName('expected_amount')
        .setDescription('Expected ADA amount')
        .setRequired(true)),

  async execute(interaction) {
    try {
      // Check if user is admin
      if (interaction.user.id !== ADMIN_USER_ID) {
        return interaction.reply({
          content: '❌ This command is only available to administrators.',
          ephemeral: true
        });
      }

      const txHash = interaction.options.getString('transaction_hash');
      const expectedAmount = interaction.options.getNumber('expected_amount');

      await interaction.deferReply({ ephemeral: true });

      console.log(`🔍 Admin debugging transaction: ${txHash}`);

      // Try to verify the transaction
      const verification = await cardanoVerifier.verifyTransaction(txHash, expectedAmount, 'debug_user');

      const embed = new EmbedBuilder()
        .setColor(verification.verified ? '#4ecdc4' : '#ff6b6b')
        .setTitle('🔍 Transaction Debug Results')
        .setDescription(`Debug results for transaction: \`${txHash}\``)
        .addFields(
          { name: '✅ Verified', value: verification.verified ? 'Yes' : 'No', inline: true },
          { name: '💰 Amount Found', value: `${verification.amount || 0} ADA`, inline: true },
          { name: '🎯 Expected', value: `${expectedAmount} ADA`, inline: true },
          { name: '🏠 Payment Address', value: cardanoVerifier.paymentAddress, inline: false }
        );

      if (verification.error) {
        embed.addFields({ name: '❌ Error', value: verification.error, inline: false });
      }

      if (verification.verified) {
        embed.addFields(
          { name: '📦 Block Height', value: `${verification.blockHeight || 'Unknown'}`, inline: true },
          { name: '⏰ Timestamp', value: `<t:${Math.floor((verification.timestamp || Date.now()) / 1000)}:F>`, inline: true }
        );
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Debug transaction command error:', error);
      await interaction.editReply({
        content: `❌ Debug failed: ${error.message}`
      });
    }
  }
};

// =============================================================================
// CHECK WALLET BALANCE COMMAND (Admin Only)
// =============================================================================

const checkBalanceCommand = {
  data: new SlashCommandBuilder()
    .setName('admin-balance')
    .setDescription('Check wallet balance (admin only)'),

  async execute(interaction) {
    try {
      // Check if user is admin
      if (interaction.user.id !== ADMIN_USER_ID) {
        return interaction.reply({
          content: '❌ This command is only available to administrators.',
          ephemeral: true
        });
      }

      await interaction.deferReply({ ephemeral: true });

      const balance = await cardanoVerifier.getWalletBalance();

      const embed = new EmbedBuilder()
        .setColor('#4ecdc4')
        .setTitle('💰 Wallet Balance')
        .addFields(
          { name: '🏠 Address', value: cardanoVerifier.paymentAddress, inline: false },
          { name: '💰 Balance', value: balance.success ? `${balance.balance} ADA` : 'Error getting balance', inline: true },
          { name: '📊 Status', value: balance.success ? '✅ Connected' : '❌ Error', inline: true }
        );

      if (!balance.success) {
        embed.addFields({ name: '❌ Error', value: balance.error, inline: false });
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Check balance command error:', error);
      await interaction.editReply({
        content: `❌ Balance check failed: ${error.message}`
      });
    }
  }
};

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  manualVerifyCommand,
  debugTransactionCommand,
  checkBalanceCommand,
  ADMIN_USER_ID
};
