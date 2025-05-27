import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import { config } from 'dotenv';

// Load environment variables
config();

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
      .setRequired(false));

const commands = [stickerizeCommand.toJSON()];

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(process.env.DISCORD_TOKEN!);

// Function to register commands globally (for all servers)
async function registerGlobalCommands() {
  try {
    console.log('Started refreshing global application (/) commands.');

    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID!),
      { body: commands },
    );

    console.log('Successfully registered global application commands.');
  } catch (error) {
    console.error('Error registering global commands:', error);
  }
}

// Function to register commands for a specific guild (faster for testing)
async function registerGuildCommands(guildId: string) {
  try {
    console.log(`Started refreshing application (/) commands for guild ${guildId}.`);

    await rest.put(
      Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID!, guildId),
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
