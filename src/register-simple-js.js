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

const commands = [stickerizeCommand.toJSON(), statsCommand.toJSON()];

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
  // If guild ID is provided, register for that guild
  if (process.env.DISCORD_GUILD_ID && process.env.DISCORD_GUILD_ID !== 'your_discord_guild_id') {
    await registerGuildCommands(process.env.DISCORD_GUILD_ID);
  } else {
    // Otherwise, register globally
    await registerGlobalCommands();
  }
}

// Run the main function
main();
