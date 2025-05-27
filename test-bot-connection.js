const { Client, GatewayIntentBits } = require('discord.js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

console.log('🔍 Testing Discord Bot Connection...');
console.log('=====================================');

// Check environment variables
console.log('\n📋 Environment Variables:');
console.log(`✅ DISCORD_TOKEN: ${process.env.DISCORD_TOKEN ? 'Set (length: ' + process.env.DISCORD_TOKEN.length + ')' : '❌ Not set'}`);
console.log(`✅ DISCORD_CLIENT_ID: ${process.env.DISCORD_CLIENT_ID ? 'Set (' + process.env.DISCORD_CLIENT_ID + ')' : '❌ Not set'}`);
console.log(`✅ REPLICATE_API_TOKEN: ${process.env.REPLICATE_API_TOKEN ? 'Set (length: ' + process.env.REPLICATE_API_TOKEN.length + ')' : '❌ Not set'}`);

// Create a test client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
});

// Test connection
client.once('ready', (c) => {
  console.log(`\n🎉 SUCCESS! Bot is online as: ${c.user.tag}`);
  console.log(`📊 Bot ID: ${c.user.id}`);
  console.log(`🌐 Connected to ${c.guilds.cache.size} servers`);
  
  // List servers
  console.log('\n🏠 Connected Servers:');
  c.guilds.cache.forEach(guild => {
    console.log(`   - ${guild.name} (ID: ${guild.id})`);
  });
  
  console.log('\n✅ Bot connection test completed successfully!');
  console.log('💡 If you can see this, your bot is online and connected.');
  console.log('🔧 Try using /stickerize command in Discord now.');
  
  // Keep running for a bit to test
  setTimeout(() => {
    console.log('\n👋 Test completed. Bot is working!');
    process.exit(0);
  }, 5000);
});

// Handle errors
client.on('error', (error) => {
  console.error('\n❌ Discord client error:', error);
});

// Handle login errors
client.login(process.env.DISCORD_TOKEN)
  .then(() => {
    console.log('\n🔐 Login attempt successful...');
  })
  .catch(error => {
    console.error('\n❌ Login failed:', error.message);
    
    if (error.message.includes('TOKEN_INVALID')) {
      console.log('\n🔧 Fix: Check your DISCORD_TOKEN in Railway environment variables');
    }
    
    process.exit(1);
  });
