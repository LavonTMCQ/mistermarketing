const { Client } = require('discord.js');
const dotenv = require('dotenv');
const fs = require('fs');

// Load environment variables
dotenv.config();

// Write to a log file
fs.writeFileSync('bot-log.txt', 'Starting login test...\n');
fs.appendFileSync('bot-log.txt', `Discord Token: ${process.env.DISCORD_TOKEN ? 'Set (length: ' + process.env.DISCORD_TOKEN.length + ')' : 'Not set'}\n`);

// Create a new client instance
const client = new Client({ intents: [] });

// Try to login
client.login(process.env.DISCORD_TOKEN)
  .then(() => {
    fs.appendFileSync('bot-log.txt', 'Login successful!\n');
    process.exit(0);
  })
  .catch(error => {
    fs.appendFileSync('bot-log.txt', `Login failed: ${error.message}\n`);
    process.exit(1);
  });
