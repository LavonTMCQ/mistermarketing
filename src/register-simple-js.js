const { REST, Routes, SlashCommandBuilder } = require('discord.js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Create the slash command
const stickerizeCommand = new SlashCommandBuilder()
  .setName('stickerize')
  .setDescription('Convert an image to an animated sticker')
  .addAttachmentOption(option =>
    option.setName('image')
      .setDescription('The image to convert')
      .setRequired(true))
  .addBooleanOption(option =>
    option.setName('sticker_size')
      .setDescription('Optimize for Discord sticker size (512KB)')
      .setRequired(false))
  .addBooleanOption(option =>
    option.setName('remove_background')
      .setDescription('Remove the background to create a transparent sticker')
      .setRequired(false))
  .addStringOption(option =>
    option.setName('animation_style')
      .setDescription('Choose the animation style')
      .setRequired(false)
      .addChoices(
        { name: '🌊 Smooth Motion (Default)', value: 'smooth' },
        { name: '🎬 Dramatic Motion', value: 'dramatic' },
        { name: '✨ Subtle Motion', value: 'subtle' },
        { name: '🎭 Live2D Style', value: 'live2d' }
      ))
  .addStringOption(option =>
    option.setName('quality')
      .setDescription('Choose animation quality (Premium requires ADA payment)')
      .setRequired(false)
      .addChoices(
        { name: '🆓 Standard Quality (Free)', value: 'standard' },
        { name: '💎 Premium Quality (Coming Soon)', value: 'premium' },
        { name: '🔥 Ultra Quality (Coming Soon)', value: 'ultra' }
      ));

// Create the stats command
const statsCommand = new SlashCommandBuilder()
  .setName('stickerstats')
  .setDescription('View bot usage statistics and information');

// Create payment commands
const subscribeCommand = new SlashCommandBuilder()
  .setName('subscribe')
  .setDescription('Subscribe to premium features with ADA payments')
  .addStringOption(option =>
    option.setName('tier')
      .setDescription('Subscription tier')
      .setRequired(true)
      .addChoices(
        { name: 'Premium - 15 ADA/month (Unlimited)', value: 'Premium' },
        { name: 'Server - 100 ADA/month (Server-wide)', value: 'Server' }
      ))
  .addIntegerOption(option =>
    option.setName('duration')
      .setDescription('Duration in months')
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(12));

const verifyPaymentCommand = new SlashCommandBuilder()
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
        { name: 'Server', value: 'Server' }
      ))
  .addIntegerOption(option =>
    option.setName('duration')
      .setDescription('Duration in months you paid for')
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(12));

const subscriptionStatusCommand = new SlashCommandBuilder()
  .setName('subscription')
  .setDescription('Check your subscription status');

const serverStatusCommand = new SlashCommandBuilder()
  .setName('server-status')
  .setDescription('Check server subscription status (admin only)');

// Admin commands for debugging
const adminVerifyCommand = new SlashCommandBuilder()
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
      .setDescription('Transaction hash (optional)')
      .setRequired(false));

const adminDebugCommand = new SlashCommandBuilder()
  .setName('admin-debug-tx')
  .setDescription('Debug a transaction hash (admin only)')
  .addStringOption(option =>
    option.setName('transaction_hash')
      .setDescription('Transaction hash to debug')
      .setRequired(true))
  .addNumberOption(option =>
    option.setName('expected_amount')
      .setDescription('Expected ADA amount')
      .setRequired(true));

const adminBalanceCommand = new SlashCommandBuilder()
  .setName('admin-balance')
  .setDescription('Check wallet balance (admin only)');

const serverUsageCommand = new SlashCommandBuilder()
  .setName('server-usage')
  .setDescription('Check server animation usage (admin only)');

const commands = [
  stickerizeCommand.toJSON(),
  statsCommand.toJSON(),
  subscribeCommand.toJSON(),
  verifyPaymentCommand.toJSON(),
  subscriptionStatusCommand.toJSON(),
  serverStatusCommand.toJSON(),
  adminVerifyCommand.toJSON(),
  adminDebugCommand.toJSON(),
  adminBalanceCommand.toJSON(),
  serverUsageCommand.toJSON()
];

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(process.env.DISCORD_TOKEN);

// Function to register commands globally (for all servers)
async function registerGlobalCommands() {
  try {
    console.log('Started refreshing global application (/) commands.');

    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
      { body: commands },
    );

    console.log('Successfully registered global application commands.');
  } catch (error) {
    console.error('Error registering global commands:', error);
  }
}

// Function to register commands for a specific guild (faster for testing)
async function registerGuildCommands(guildId) {
  try {
    console.log(`Started refreshing application (/) commands for guild ${guildId}.`);

    await rest.put(
      Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, guildId),
      { body: commands },
    );

    console.log(`Successfully registered application commands for guild ${guildId}.`);
  } catch (error) {
    console.error('Error registering guild commands:', error);
  }
}

// Main function
async function main() {
  // Register both guild and global commands to ensure they appear
  if (process.env.DISCORD_GUILD_ID && process.env.DISCORD_GUILD_ID !== 'your_discord_guild_id') {
    console.log('Registering guild commands...');
    await registerGuildCommands(process.env.DISCORD_GUILD_ID);
  }

  // Also register globally for backup
  console.log('Registering global commands...');
  await registerGlobalCommands();
}

// Run the main function
main();
