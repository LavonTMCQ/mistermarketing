// 🔄 Force Refresh Discord Commands
const { REST, Routes } = require('discord.js');
const dotenv = require('dotenv');

dotenv.config();

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

async function forceRefreshCommands() {
  try {
    console.log('🔄 Force refreshing Discord commands...\n');

    // Step 1: Clear all existing commands
    console.log('🧹 Clearing existing commands...');
    
    // Clear guild commands
    if (process.env.DISCORD_GUILD_ID) {
      await rest.put(
        Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID),
        { body: [] }
      );
      console.log('✅ Guild commands cleared');
    }

    // Clear global commands
    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
      { body: [] }
    );
    console.log('✅ Global commands cleared');

    // Step 2: Wait a moment
    console.log('⏳ Waiting 3 seconds...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 3: Re-register commands
    console.log('📝 Re-registering commands...');
    
    // Import and run the registration script
    require('./src/register-simple-js.js');

    console.log('🎉 Force refresh completed!');
    console.log('\n💡 If commands still don\'t appear:');
    console.log('1. Restart Discord completely');
    console.log('2. Try Discord web version');
    console.log('3. Wait 5-10 minutes for cache refresh');

  } catch (error) {
    console.error('❌ Error force refreshing commands:', error);
  }
}

forceRefreshCommands();
