// 🔍 Verify Discord Commands are Registered
const { REST, Routes } = require('discord.js');
const dotenv = require('dotenv');

dotenv.config();

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

async function verifyCommands() {
  try {
    console.log('🔍 Checking registered Discord commands...\n');

    // Check guild commands
    if (process.env.DISCORD_GUILD_ID) {
      console.log(`📋 Guild Commands (${process.env.DISCORD_GUILD_ID}):`);
      const guildCommands = await rest.get(
        Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID)
      );
      
      if (guildCommands.length === 0) {
        console.log('❌ No guild commands found!');
      } else {
        guildCommands.forEach(cmd => {
          console.log(`✅ /${cmd.name} - ${cmd.description}`);
          if (cmd.options && cmd.options.length > 0) {
            cmd.options.forEach(opt => {
              console.log(`   └─ ${opt.name} (${opt.type === 11 ? 'attachment' : opt.type === 5 ? 'boolean' : opt.type === 3 ? 'string' : 'other'}): ${opt.description}`);
              if (opt.choices && opt.choices.length > 0) {
                opt.choices.forEach(choice => {
                  console.log(`      └─ ${choice.name} (${choice.value})`);
                });
              }
            });
          }
        });
      }
    }

    // Check global commands
    console.log('\n🌍 Global Commands:');
    const globalCommands = await rest.get(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID)
    );
    
    if (globalCommands.length === 0) {
      console.log('❌ No global commands found!');
    } else {
      globalCommands.forEach(cmd => {
        console.log(`✅ /${cmd.name} - ${cmd.description}`);
        if (cmd.options && cmd.options.length > 0) {
          cmd.options.forEach(opt => {
            console.log(`   └─ ${opt.name} (${opt.type === 11 ? 'attachment' : opt.type === 5 ? 'boolean' : opt.type === 3 ? 'string' : 'other'}): ${opt.description}`);
            if (opt.choices && opt.choices.length > 0) {
              opt.choices.forEach(choice => {
                console.log(`      └─ ${choice.name} (${choice.value})`);
              });
            }
          });
        }
      });
    }

    console.log('\n🎯 Expected Commands:');
    console.log('✅ /stickerize - Convert an image to an animated sticker');
    console.log('   └─ image (attachment): The image to convert');
    console.log('   └─ sticker_size (boolean): Optimize for Discord sticker size (512KB)');
    console.log('   └─ remove_background (boolean): Remove the background to create a transparent sticker');
    console.log('   └─ animation_style (string): Choose the animation style');
    console.log('      └─ 🌊 Smooth Motion (Default) (smooth)');
    console.log('      └─ 🎬 Dramatic Motion (dramatic)');
    console.log('      └─ ✨ Subtle Motion (subtle)');
    console.log('      └─ 🎭 Live2D Style (live2d)');
    console.log('   └─ quality (string): Choose animation quality (Premium requires ADA payment)');
    console.log('      └─ 🆓 Standard Quality (Free) (standard)');
    console.log('      └─ 💎 Premium Quality (Coming Soon) (premium)');
    console.log('      └─ 🔥 Ultra Quality (Coming Soon) (ultra)');
    console.log('✅ /stickerstats - View bot usage statistics and information');

  } catch (error) {
    console.error('❌ Error verifying commands:', error);
  }
}

verifyCommands();
