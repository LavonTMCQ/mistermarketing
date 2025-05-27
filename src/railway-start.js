const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Railway Startup Script');
console.log('=========================');
console.log('Node.js version:', process.version);
console.log('Platform:', process.platform);
console.log('Working directory:', process.cwd());
console.log('Environment variables check:');
console.log('- DISCORD_TOKEN:', process.env.DISCORD_TOKEN ? `Set (${process.env.DISCORD_TOKEN.length} chars)` : 'NOT SET');
console.log('- DISCORD_CLIENT_ID:', process.env.DISCORD_CLIENT_ID || 'NOT SET');
console.log('- DISCORD_GUILD_ID:', process.env.DISCORD_GUILD_ID || 'NOT SET');
console.log('- REPLICATE_API_TOKEN:', process.env.REPLICATE_API_TOKEN ? `Set (${process.env.REPLICATE_API_TOKEN.length} chars)` : 'NOT SET');
console.log('- PORT:', process.env.PORT || 'NOT SET');

async function registerCommands() {
  return new Promise((resolve, reject) => {
    console.log('\n📝 Step 1: Registering Discord commands...');

    const registerProcess = spawn('node', ['src/register-simple-js.js'], {
      stdio: 'inherit',
      cwd: process.cwd()
    });

    registerProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Commands registered successfully!');
        resolve();
      } else {
        console.error(`❌ Command registration failed with code ${code}`);
        reject(new Error(`Registration failed with code ${code}`));
      }
    });

    registerProcess.on('error', (error) => {
      console.error('❌ Error starting registration process:', error);
      reject(error);
    });
  });
}

async function startBot() {
  return new Promise((resolve, reject) => {
    console.log('\n🤖 Step 2: Starting Stickerize bot...');

    const botProcess = spawn('node', ['src/logging-bot.js'], {
      stdio: 'inherit',
      cwd: process.cwd()
    });

    botProcess.on('close', (code) => {
      console.log(`🔄 Bot process exited with code ${code}`);
      // Don't reject here, as the bot should keep running
    });

    botProcess.on('error', (error) => {
      console.error('❌ Error starting bot process:', error);
      reject(error);
    });

    // Consider the bot started successfully after a short delay
    setTimeout(() => {
      console.log('✅ Bot startup initiated');
      resolve();
    }, 2000);
  });
}

async function main() {
  try {
    // Step 1: Register commands
    await registerCommands();

    // Step 2: Start bot
    await startBot();

    console.log('\n🎉 Startup sequence completed!');

    // Keep the process alive
    setInterval(() => {
      console.log(`💓 Startup script heartbeat - ${new Date().toISOString()}`);
    }, 300000); // Every 5 minutes

  } catch (error) {
    console.error('\n❌ Startup failed:', error);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGTERM', () => {
  console.log('\n👋 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n👋 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

// Start the main process
main();
