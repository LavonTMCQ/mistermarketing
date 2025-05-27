import { Client, Events, GatewayIntentBits } from 'discord.js';
import { config } from 'dotenv';

// Load environment variables
config();

console.log('Starting Minimal Bot...');
console.log('Discord Token:', process.env.DISCORD_TOKEN ? 'Set' : 'Not set');

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
});

// When the client is ready, run this code (only once)
client.once(Events.ClientReady, (c) => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
});

// Handle errors
client.on('error', (error) => {
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

// Login to Discord with your client's token
client.login(process.env.DISCORD_TOKEN)
  .then(() => console.log('Login successful'))
  .catch(error => console.error('Login failed:', error));
