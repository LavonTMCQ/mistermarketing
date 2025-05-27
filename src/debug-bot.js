const { Client, GatewayIntentBits } = require('discord.js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

console.log('🚀 DEBUG BOT STARTING...');
console.log('========================');
console.log('Node.js version:', process.version);
console.log('Platform:', process.platform);
console.log('Current time:', new Date().toISOString());

// Check environment variables
console.log('\n📋 Environment Variables Check:');
console.log('DISCORD_TOKEN:', process.env.DISCORD_TOKEN ? `Set (${process.env.DISCORD_TOKEN.length} chars)` : 'NOT SET');
console.log('DISCORD_CLIENT_ID:', process.env.DISCORD_CLIENT_ID || 'NOT SET');
console.log('DISCORD_GUILD_ID:', process.env.DISCORD_GUILD_ID || 'NOT SET');
console.log('REPLICATE_API_TOKEN:', process.env.REPLICATE_API_TOKEN ? `Set (${process.env.REPLICATE_API_TOKEN.length} chars)` : 'NOT SET');
console.log('PORT:', process.env.PORT || 'NOT SET');

// Create a simple HTTP server for Railway health checks
const http = require('http');
const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  console.log(`📡 Health check request: ${req.method} ${req.url}`);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    message: 'Debug bot is running'
  }));
});

server.listen(PORT, () => {
  console.log(`🌐 Health check server running on port ${PORT}`);
});

// Create Discord client
console.log('\n🤖 Creating Discord client...');
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
});

// Bot ready event
client.once('ready', (c) => {
  console.log('\n🎉 BOT IS READY!');
  console.log(`✅ Logged in as: ${c.user.tag}`);
  console.log(`📊 Bot ID: ${c.user.id}`);
  console.log(`🌐 Connected to ${c.guilds.cache.size} servers`);
  
  // List servers
  console.log('\n🏠 Connected Servers:');
  c.guilds.cache.forEach(guild => {
    console.log(`   - ${guild.name} (ID: ${guild.id})`);
  });
  
  console.log('\n✅ Bot is fully operational!');
});

// Handle interactions
client.on('interactionCreate', async interaction => {
  console.log(`\n📨 Interaction received: ${interaction.type}`);
  
  if (!interaction.isChatInputCommand()) {
    console.log('❌ Not a chat input command');
    return;
  }

  console.log(`🎯 Command: ${interaction.commandName}`);
  console.log(`👤 User: ${interaction.user.tag}`);
  console.log(`🏠 Guild: ${interaction.guild?.name || 'DM'}`);

  if (interaction.commandName === 'stickerize') {
    console.log('🎨 Processing stickerize command...');
    
    try {
      await interaction.reply({
        content: '🚧 Debug mode: Bot is working! Command received successfully. Full functionality coming soon...',
        ephemeral: false
      });
      console.log('✅ Response sent successfully');
    } catch (error) {
      console.error('❌ Error sending response:', error);
    }
  }
});

// Error handling
client.on('error', (error) => {
  console.error('\n❌ Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('\n❌ Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('\n❌ Uncaught exception:', error);
});

// Login
console.log('\n🔐 Attempting to login to Discord...');
client.login(process.env.DISCORD_TOKEN)
  .then(() => {
    console.log('✅ Login successful!');
  })
  .catch(error => {
    console.error('❌ Login failed:', error);
    process.exit(1);
  });

// Keep alive
setInterval(() => {
  console.log(`💓 Bot heartbeat - ${new Date().toISOString()} - Uptime: ${Math.floor(process.uptime())}s`);
}, 60000); // Every minute
