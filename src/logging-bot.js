const { Client, GatewayIntentBits } = require('discord.js');
const dotenv = require('dotenv');
const fs = require('fs');

// Load environment variables
dotenv.config();

// Start health check server for Railway
require('./health-check.js');

// Import payment system
const { subscriptionManager, paymentVerifier } = require('./commands/payment-commands');
const { ServerManager } = require('./server-management');

// Tier-based rate limiting
const userUsage = new Map(); // userId -> { count, resetTime }
const RESET_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds

// Rate limits by tier
const TIER_LIMITS = {
  'Standard': 10,    // Free tier: 10 animations per hour
  'Premium': 50,     // Premium tier: 50 animations per hour
  'Ultra': 999999,   // Ultra tier: Unlimited
  'Server': 999999   // Server tier: Unlimited
};

// Helper function to get next reset time (1 hour from now)
function getNextResetTime() {
  return Date.now() + RESET_INTERVAL;
}

// Helper function to check and update user usage
function checkUserUsage(userId) {
  const now = Date.now();

  if (!userUsage.has(userId)) {
    userUsage.set(userId, { count: 0, resetTime: getNextResetTime() });
  }

  const userData = userUsage.get(userId);

  // Reset count if past reset time
  if (now >= userData.resetTime) {
    userData.count = 0;
    userData.resetTime = getNextResetTime();
  }

  return userData;
}

// Helper function to get user's rate limit based on tier (including server subscriptions)
function getUserRateLimit(userId, guildId) {
  // Check server subscription first
  if (guildId && serverManager && serverManager.hasActiveServerSubscription(guildId)) {
    return TIER_LIMITS['Server']; // Unlimited for server subscriptions
  }

  // Check personal subscription
  const userTier = subscriptionManager.getUserTier(userId);
  return TIER_LIMITS[userTier] || TIER_LIMITS['Standard'];
}

// Helper function to increment user usage
function incrementUserUsage(userId, guildId) {
  const userData = checkUserUsage(userId);
  const userLimit = getUserRateLimit(userId, guildId);
  const effectiveTier = getEffectiveUserTier(userId, guildId);
  userData.count++;
  fs.appendFileSync('bot-log.txt', `User ${userId} (${effectiveTier}) usage: ${userData.count}/${userLimit} (resets in ${Math.ceil((userData.resetTime - Date.now()) / (1000 * 60))} minutes)\n`);
}

// Helper function to check if user is over limit
function isUserOverLimit(userId, guildId) {
  const userData = checkUserUsage(userId);
  const userLimit = getUserRateLimit(userId, guildId);
  return userData.count >= userLimit;
}

// Helper function to get effective user tier (considering server subscriptions)
function getEffectiveUserTier(userId, guildId) {
  // Check server subscription first
  if (guildId && serverManager && serverManager.hasActiveServerSubscription(guildId)) {
    return 'Server';
  }

  // Check personal subscription
  return subscriptionManager.getUserTier(userId);
}

// Clear log file
fs.writeFileSync('bot-log.txt', 'Starting Logging Bot...\n');
fs.appendFileSync('bot-log.txt', `Discord Token: ${process.env.DISCORD_TOKEN ? 'Set (length: ' + process.env.DISCORD_TOKEN.length + ')' : 'Not set'}\n`);

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
});

// Initialize server manager
let serverManager;

// When the client is ready, run this code (only once)
client.once('ready', (c) => {
  const message = `Ready! Logged in as ${c.user.tag}`;
  console.log(message);
  fs.appendFileSync('bot-log.txt', message + '\n');

  // Initialize server manager
  serverManager = new ServerManager(client);
  console.log('✅ Server manager initialized');
});

// Handle bot joining new servers
client.on('guildCreate', async (guild) => {
  if (serverManager) {
    await serverManager.handleServerJoin(guild);
  }
});

// Handle interactions (slash commands)
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const message = `Received command: ${interaction.commandName}`;
  console.log(message);
  fs.appendFileSync('bot-log.txt', message + '\n');

  if (interaction.commandName === 'stickerize') {
    await handleStickerizeCommand(interaction);
  } else if (interaction.commandName === 'stickerstats') {
    await handleStatsCommand(interaction);
  } else if (interaction.commandName === 'subscribe') {
    const { subscribeCommand } = require('./commands/payment-commands');
    await subscribeCommand.execute(interaction);
  } else if (interaction.commandName === 'verify-payment') {
    const { verifyPaymentCommand } = require('./commands/payment-commands');
    await verifyPaymentCommand.execute(interaction);
  } else if (interaction.commandName === 'subscription') {
    const { statusCommand } = require('./commands/payment-commands');
    await statusCommand.execute(interaction);
  } else if (interaction.commandName === 'server-status') {
    const { serverStatusCommand } = require('./commands/payment-commands');
    await serverStatusCommand.execute(interaction);
  }
});

// Handle the stickerize command
async function handleStickerizeCommand(interaction) {
  try {
    // Defer reply to give us time to process
    await interaction.deferReply();
    fs.appendFileSync('bot-log.txt', 'Processing stickerize command...\n');

    // Check rate limiting
    const userId = interaction.user.id;
    const guildId = interaction.guildId;
    const userData = checkUserUsage(userId);
    const effectiveTier = getEffectiveUserTier(userId, guildId);
    const userLimit = getUserRateLimit(userId, guildId);

    fs.appendFileSync('bot-log.txt', `User ${userId} (${interaction.user.username}) - Tier: ${effectiveTier}, Usage: ${userData.count}/${userLimit}, Guild: ${guildId}\n`);

    // Check if user has exceeded hourly limit
    if (isUserOverLimit(userId, guildId)) {
      const minutesUntilReset = Math.ceil((userData.resetTime - Date.now()) / (1000 * 60));

      const rateLimitEmbed = {
        color: 0xffa500,
        title: '⏱️ Rate Limit Reached',
        description: `You've used all **${userLimit}** animations this hour on your **${effectiveTier}** tier.`,
        fields: [
          {
            name: '🎯 Current Tier',
            value: effectiveTier,
            inline: true
          },
          {
            name: '🔄 Limit Resets In',
            value: `${minutesUntilReset} minutes`,
            inline: true
          },
          {
            name: '🚀 Upgrade Options',
            value: effectiveTier === 'Standard' ?
              '**Personal**: Premium (50/hr) or Ultra (unlimited)\n**Server**: 100 ADA/month for unlimited server-wide access\n\nUse `/subscribe` to upgrade!' :
              effectiveTier === 'Server' ? 'Server has unlimited access! 🎉' : 'You\'re already on a premium tier! 🎉',
            inline: false
          }
        ],
        footer: {
          text: 'Thanks for using Stickerize Bot! 🎨'
        },
        timestamp: new Date().toISOString()
      };

      await interaction.followUp({
        embeds: [rateLimitEmbed],
        ephemeral: true
      });

      fs.appendFileSync('bot-log.txt', `User ${userId} hit rate limit (${effectiveTier} tier), shown rate limit message\n`);
      return;
    }

    // Increment usage
    incrementUserUsage(userId, guildId);

    // Get attachment and options
    const attachment = interaction.options.getAttachment('image');
    const stickerSize = interaction.options.getBoolean('sticker_size') || false;
    const removeBackground = interaction.options.getBoolean('remove_background') || false;
    const animationStyle = interaction.options.getString('animation_style') || 'smooth';
    const quality = interaction.options.getString('quality') || 'standard';

    fs.appendFileSync('bot-log.txt', `Sticker size option: ${stickerSize}\n`);
    fs.appendFileSync('bot-log.txt', `Remove background option: ${removeBackground}\n`);
    fs.appendFileSync('bot-log.txt', `Animation style: ${animationStyle}\n`);
    fs.appendFileSync('bot-log.txt', `Quality option: ${quality}\n`);

    // Check if user requested premium quality
    if (quality === 'premium' || quality === 'ultra') {
      const premiumEmbed = {
        color: 0x9b59b6,
        title: '💎 Premium Quality Coming Soon!',
        description: 'You\'ve selected premium quality animation. We\'re building something revolutionary!',
        fields: [
          {
            name: '🪙 Cardano Smart Contract Payments',
            value: 'Pay with ADA cryptocurrency for premium features!\n• Instant payments\n• Decentralized\n• Lower fees than traditional payments',
            inline: false
          },
          {
            name: '🔥 Premium Features (Coming Soon)',
            value: '💎 **Premium Quality**: MiniMax Video-01-Live model\n🔥 **Ultra Quality**: Latest AI models\n⚡ **Priority Processing**: Skip the queue\n🎨 **Advanced Styles**: Exclusive animation effects',
            inline: false
          },
          {
            name: '📅 Launch Timeline',
            value: '**Phase 1**: Smart contract development (2-4 weeks)\n**Phase 2**: ADA payment integration (1-2 weeks)\n**Phase 3**: Premium model deployment (1 week)',
            inline: false
          },
          {
            name: '🚀 Be a Beta Tester!',
            value: 'Want early access? Join our Discord community and help test the Cardano integration!',
            inline: false
          }
        ],
        footer: {
          text: 'Stickerize Bot - Revolutionizing Discord payments with Cardano! 🪙'
        },
        timestamp: new Date().toISOString()
      };

      await interaction.followUp({
        embeds: [premiumEmbed],
        ephemeral: true
      });

      // For now, continue with standard quality
      fs.appendFileSync('bot-log.txt', `User ${userId} requested ${quality} quality, shown coming soon message, proceeding with standard\n`);
    }

    if (!attachment) {
      await interaction.followUp({
        content: 'Please attach an image to convert.',
        ephemeral: true
      });
      fs.appendFileSync('bot-log.txt', 'No attachment found\n');
      return;
    }

    fs.appendFileSync('bot-log.txt', `Attachment found: ${attachment.name} (${attachment.size} bytes)\n`);

    // Validate attachment
    if (attachment.size > 8 * 1024 * 1024) {
      await interaction.followUp({
        content: `File ${attachment.name} is too large. Maximum size is 8MB.`,
        ephemeral: true
      });
      fs.appendFileSync('bot-log.txt', 'File too large\n');
      return;
    }

    const validTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    if (!validTypes.includes(attachment.contentType)) {
      await interaction.followUp({
        content: `File ${attachment.name} is not a valid image type. Supported types: PNG, JPEG, GIF, WEBP.`,
        ephemeral: true
      });
      fs.appendFileSync('bot-log.txt', `Invalid content type: ${attachment.contentType}\n`);
      return;
    }

    // Process the image
    await interaction.followUp({
      content: `Processing image. This may take up to 60 seconds...`,
      ephemeral: false
    });

    // Import required modules
    const axios = require('axios');
    const path = require('path');
    const { execSync, exec } = require('child_process');

    // Create temp directory if it doesn't exist
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Download the image
    fs.appendFileSync('bot-log.txt', `Downloading image from ${attachment.url}\n`);
    const response = await axios({
      method: 'GET',
      url: attachment.url,
      responseType: 'arraybuffer'
    });

    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.png`;
    const imagePath = path.join(tempDir, filename);
    fs.writeFileSync(imagePath, response.data);
    fs.appendFileSync('bot-log.txt', `Image saved to ${imagePath}\n`);

    // Process image if background removal is requested
    let processedImagePath = imagePath;

    // Process background removal if requested
    if (removeBackground) {
      await interaction.followUp({
        content: 'Removing background... This may take an extra 30 seconds.',
        ephemeral: false
      });

      try {
        fs.appendFileSync('bot-log.txt', 'Starting background removal with Replicate API\n');
        processedImagePath = await removeImageBackgroundWithAI(imagePath, tempDir);
        fs.appendFileSync('bot-log.txt', `Background removal completed: ${processedImagePath}\n`);
      } catch (bgError) {
        fs.appendFileSync('bot-log.txt', `Background removal failed: ${bgError.message}\n`);

        // Provide more helpful error messages
        let errorMessage = 'Background removal failed, proceeding with original image.';
        if (bgError.message.includes('Authentication')) {
          errorMessage = '⚠️ Background removal temporarily unavailable (API issue). Proceeding with original image.';
        } else if (bgError.message.includes('timeout')) {
          errorMessage = '⚠️ Background removal took too long. Proceeding with original image.';
        }

        await interaction.followUp({
          content: errorMessage,
          ephemeral: false
        });
        processedImagePath = imagePath;
      }
    }

    // Generate animation using Replicate API
    fs.appendFileSync('bot-log.txt', 'Generating animation with Replicate...\n');
    await interaction.followUp({
      content: `Generating animation... This may take a minute or two.`,
      ephemeral: false
    });

    // Read image file as base64
    const imageBuffer = fs.readFileSync(processedImagePath);
    const base64Image = imageBuffer.toString('base64');

    // Determine animation parameters based on style
    let motionBucketId, fps, numFrames;

    switch (animationStyle) {
      case 'dramatic':
        motionBucketId = 180; // More motion
        fps = 10;
        numFrames = 20;
        break;
      case 'subtle':
        motionBucketId = 80; // Less motion
        fps = 6;
        numFrames = 12;
        break;
      case 'live2d':
        motionBucketId = 100; // Moderate motion, good for characters
        fps = 8;
        numFrames = 16;
        break;
      case 'smooth':
      default:
        motionBucketId = 127; // Default balanced motion
        fps = 8;
        numFrames = 16;
        break;
    }

    fs.appendFileSync('bot-log.txt', `Using animation parameters: motion=${motionBucketId}, fps=${fps}, frames=${numFrames}\n`);

    // Call Replicate API
    const replicateResponse = await axios.post(
      'https://api.replicate.com/v1/predictions',
      {
        version: 'd68b6e09eedbac7a49e3d8644999d93579c386a083768235cabca88796d70d82',
        input: {
          input_image: `data:image/png;base64,${base64Image}`,
          motion_bucket_id: motionBucketId,
          fps: fps,
          num_frames: numFrames
        }
      },
      {
        headers: {
          'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const predictionId = replicateResponse.data.id;
    fs.appendFileSync('bot-log.txt', `Prediction started with ID: ${predictionId}\n`);

    // Poll for completion
    let prediction;
    let attempts = 0;
    const maxAttempts = 30; // 5 minutes max (10 seconds per attempt)

    while (attempts < maxAttempts) {
      const pollResponse = await axios.get(
        `https://api.replicate.com/v1/predictions/${predictionId}`,
        {
          headers: {
            'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );

      prediction = pollResponse.data;

      if (prediction.status === 'succeeded') {
        break;
      } else if (prediction.status === 'failed') {
        const errorMessage = prediction.error || 'Unknown error';
        fs.appendFileSync('bot-log.txt', `Replicate prediction failed: ${JSON.stringify(prediction)}\n`);
        throw new Error(`Replicate prediction failed: ${errorMessage}`);
      }

      // Wait 10 seconds before polling again
      await new Promise(resolve => setTimeout(resolve, 10000));
      attempts++;
      fs.appendFileSync('bot-log.txt', `Polling attempt ${attempts}...\n`);
    }

    if (!prediction || prediction.status !== 'succeeded') {
      throw new Error('Prediction timed out or failed');
    }

    // Download the video
    const videoUrl = prediction.output;
    fs.appendFileSync('bot-log.txt', `Animation generated: ${videoUrl}\n`);

    const videoResponse = await axios({
      method: 'GET',
      url: videoUrl,
      responseType: 'arraybuffer'
    });

    // Save the video
    const videoPath = imagePath.replace(/\.[^/.]+$/, '.mp4');
    fs.writeFileSync(videoPath, videoResponse.data);
    fs.appendFileSync('bot-log.txt', `Video saved to ${videoPath}\n`);

    // Convert MP4 to GIF
    fs.appendFileSync('bot-log.txt', 'Converting MP4 to GIF...\n');
    await interaction.followUp({
      content: 'Converting to GIF format...',
      ephemeral: false
    });

    const gifPath = videoPath.replace(/\.[^/.]+$/, '.gif');

    // Use ffmpeg to convert MP4 to GIF with appropriate size based on option
    await new Promise((resolve, reject) => {
      // Determine the appropriate size and quality based on the sticker_size option
      let scale, fps;

      if (stickerSize) {
        // For Discord stickers (max 512KB), use larger dimensions but lower fps
        scale = "320:-1"; // 320px width, maintain aspect ratio
        fps = 8;
        fs.appendFileSync('bot-log.txt', 'Using Discord sticker size optimization\n');
      } else {
        // For regular emoji/reaction GIFs, use smaller dimensions but higher fps
        scale = "256:-1"; // 256px width, maintain aspect ratio
        fps = 10;
        fs.appendFileSync('bot-log.txt', 'Using regular emoji size optimization\n');
      }

      // First, generate a palette for better quality
      const paletteCommand = `ffmpeg -i ${videoPath} -vf "fps=${fps},scale=${scale}:flags=lanczos,palettegen" -y ${tempDir}/palette.png`;
      fs.appendFileSync('bot-log.txt', `Running palette command: ${paletteCommand}\n`);

      exec(paletteCommand, (error, stdout, stderr) => {
        if (error) {
          fs.appendFileSync('bot-log.txt', `Palette generation error: ${error.message}\n`);
          // Continue anyway with direct conversion
          const directCommand = `ffmpeg -i ${videoPath} -vf "fps=${fps},scale=${scale}:flags=lanczos" -y ${gifPath}`;
          fs.appendFileSync('bot-log.txt', `Running direct conversion: ${directCommand}\n`);

          exec(directCommand, (error2, stdout2, stderr2) => {
            if (error2) {
              fs.appendFileSync('bot-log.txt', `Direct conversion error: ${error2.message}\n`);
              reject(error2);
              return;
            }
            resolve();
          });
          return;
        }

        // Then use the palette to create high-quality GIF
        const gifCommand = `ffmpeg -i ${videoPath} -i ${tempDir}/palette.png -lavfi "fps=${fps},scale=${scale}:flags=lanczos [x]; [x][1:v] paletteuse" -y ${gifPath}`;
        fs.appendFileSync('bot-log.txt', `Running GIF command: ${gifCommand}\n`);

        exec(gifCommand, (error3, stdout3, stderr3) => {
          if (error3) {
            fs.appendFileSync('bot-log.txt', `GIF creation error: ${error3.message}\n`);
            reject(error3);
            return;
          }

          // Clean up palette
          try {
            fs.unlinkSync(`${tempDir}/palette.png`);
          } catch (e) {
            // Ignore palette cleanup errors
          }

          resolve();
        });
      });
    }).catch(error => {
      fs.appendFileSync('bot-log.txt', `GIF conversion error: ${error.message}\n`);
      throw new Error(`Failed to convert to GIF: ${error.message}`);
    });

    // Check if GIF was created and optimize based on the selected option
    if (fs.existsSync(gifPath)) {
      const gifStats = fs.statSync(gifPath);
      const gifSizeKB = gifStats.size / 1024;
      fs.appendFileSync('bot-log.txt', `GIF created: ${gifPath} (${gifSizeKB.toFixed(2)} KB)\n`);

      // Determine size limit based on option
      const sizeLimit = stickerSize ? 512 : 256; // 512KB for stickers, 256KB for emojis

      if (gifSizeKB > sizeLimit) {
        fs.appendFileSync('bot-log.txt', `GIF is too large (${gifSizeKB.toFixed(2)} KB), optimizing for ${stickerSize ? 'sticker' : 'emoji'}...\n`);

        // Try to optimize the GIF
        const optimizedGifPath = gifPath.replace(/\.gif$/, '.optimized.gif');

        // Different optimization settings based on the option
        let scale, fps;
        if (stickerSize) {
          // For stickers, we can reduce fps more to maintain size
          scale = "320:-1";
          fps = 6;
        } else {
          // For emojis, we can reduce size more
          scale = "200:-1";
          fps = 8;
        }

        const optimizeCommand = `ffmpeg -i ${gifPath} -vf "fps=${fps},scale=${scale}:flags=lanczos" -y ${optimizedGifPath}`;

        try {
          execSync(optimizeCommand);

          if (fs.existsSync(optimizedGifPath)) {
            const optimizedStats = fs.statSync(optimizedGifPath);
            const optimizedSizeKB = optimizedStats.size / 1024;
            fs.appendFileSync('bot-log.txt', `Optimized GIF: ${optimizedGifPath} (${optimizedSizeKB.toFixed(2)} KB)\n`);

            if (optimizedSizeKB <= sizeLimit) {
              // Use the optimized GIF
              fs.renameSync(optimizedGifPath, gifPath);
            } else if (stickerSize && optimizedSizeKB <= 512) {
              // For stickers, if we're under 512KB, that's good enough
              fs.renameSync(optimizedGifPath, gifPath);
            } else {
              // If still too large, try more aggressive optimization
              const finalGifPath = optimizedGifPath.replace(/\.optimized\.gif$/, '.final.gif');
              const finalCommand = `ffmpeg -i ${optimizedGifPath} -vf "fps=5,scale=${stickerSize ? '240' : '160'}:-1:flags=lanczos" -y ${finalGifPath}`;

              try {
                execSync(finalCommand);

                if (fs.existsSync(finalGifPath)) {
                  const finalStats = fs.statSync(finalGifPath);
                  const finalSizeKB = finalStats.size / 1024;
                  fs.appendFileSync('bot-log.txt', `Final GIF: ${finalGifPath} (${finalSizeKB.toFixed(2)} KB)\n`);

                  // Use the final GIF regardless of size - we've done our best
                  fs.renameSync(finalGifPath, gifPath);
                }
              } catch (finalError) {
                fs.appendFileSync('bot-log.txt', `Final optimization error: ${finalError.message}\n`);
                // Continue with the original optimized GIF
              }
            }
          }
        } catch (optimizeError) {
          fs.appendFileSync('bot-log.txt', `Optimization error: ${optimizeError.message}\n`);
          // Continue with the original GIF
        }
      }

      // Get final GIF size for logging
      const finalStats = fs.statSync(gifPath);
      const finalSizeKB = finalStats.size / 1024;

      // Send the GIF with appropriate message
      let content;
      if (stickerSize) {
        content = `Here is your animated sticker! (${finalSizeKB.toFixed(0)}KB/${sizeLimit}KB)`;
      } else {
        content = `Here is your animated emoji! (${finalSizeKB.toFixed(0)}KB/${sizeLimit}KB)`;
      }

      await interaction.followUp({
        content: content,
        files: [{ attachment: gifPath, name: stickerSize ? 'sticker.gif' : 'emoji.gif' }]
      });
    } else {
      // If GIF conversion failed, send the MP4 as fallback
      await interaction.followUp({
        content: 'Could not create GIF, here is the animated video instead:',
        files: [{ attachment: videoPath, name: 'animation.mp4' }]
      });
    }

    fs.appendFileSync('bot-log.txt', 'Command completed successfully\n');

    // Clean up temp files
    try {
      // Clean up original image
      fs.unlinkSync(imagePath);

      // Clean up frame extraction if it exists
      const firstFramePath = imagePath.replace(/\.[^/.]+$/, '.frame.png');
      if (fs.existsSync(firstFramePath)) {
        fs.unlinkSync(firstFramePath);
      }

      // Clean up processed image if different from original
      if (processedImagePath !== imagePath && fs.existsSync(processedImagePath)) {
        fs.unlinkSync(processedImagePath);
      }

      // Clean up video and GIF files
      fs.unlinkSync(videoPath);
      if (fs.existsSync(gifPath)) {
        fs.unlinkSync(gifPath);
      }

      // Clean up any optimized GIFs
      const optimizedGifPath = gifPath.replace(/\.gif$/, '.optimized.gif');
      if (fs.existsSync(optimizedGifPath)) {
        fs.unlinkSync(optimizedGifPath);
      }

      const finalGifPath = optimizedGifPath.replace(/\.optimized\.gif$/, '.final.gif');
      if (fs.existsSync(finalGifPath)) {
        fs.unlinkSync(finalGifPath);
      }

      // Clean up background removal temp directory
      const bgTmpDir = path.join(tempDir, 'bg_removal_tmp');
      if (fs.existsSync(bgTmpDir)) {
        try {
          fs.rmdirSync(bgTmpDir, { recursive: true });
        } catch (e) {
          // Ignore cleanup errors for the temp directory
        }
      }
    } catch (cleanupError) {
      fs.appendFileSync('bot-log.txt', `Cleanup error: ${cleanupError.message}\n`);
    }
  } catch (error) {
    console.error('Error in stickerize command:', error);
    fs.appendFileSync('bot-log.txt', `Error: ${error.message}\n${error.stack}\n`);

    try {
      await interaction.followUp({
        content: `An error occurred: ${error.message}`,
        ephemeral: true
      });
    } catch (followUpError) {
      console.error('Error sending follow-up:', followUpError);
      fs.appendFileSync('bot-log.txt', `Error sending follow-up: ${followUpError.message}\n`);
    }
  }
}

// Handle the stats command
async function handleStatsCommand(interaction) {
  try {
    await interaction.deferReply();
    fs.appendFileSync('bot-log.txt', 'Processing stickerstats command...\n');

    // Read bot log to get basic stats
    let totalCommands = 0;
    let successfulCommands = 0;
    let failedCommands = 0;
    let backgroundRemovals = 0;
    let stickerSizeRequests = 0;

    try {
      if (fs.existsSync('bot-log.txt')) {
        const logContent = fs.readFileSync('bot-log.txt', 'utf8');
        const lines = logContent.split('\n');

        lines.forEach(line => {
          if (line.includes('Processing stickerize command')) totalCommands++;
          if (line.includes('Command completed successfully')) successfulCommands++;
          if (line.includes('Error:')) failedCommands++;
          if (line.includes('Starting background removal')) backgroundRemovals++;
          if (line.includes('Using Discord sticker size optimization')) stickerSizeRequests++;
        });
      }
    } catch (error) {
      fs.appendFileSync('bot-log.txt', `Error reading stats: ${error.message}\n`);
    }

    // Get bot uptime
    const uptimeSeconds = process.uptime();
    const uptimeHours = Math.floor(uptimeSeconds / 3600);
    const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60);

    // Create stats embed
    const statsEmbed = {
      color: 0x00ff00,
      title: '📊 Stickerize Bot Statistics',
      description: 'Here are the current bot statistics and information',
      fields: [
        {
          name: '🎯 Usage Statistics',
          value: `**Total Commands:** ${totalCommands}\n**Successful:** ${successfulCommands}\n**Failed:** ${failedCommands}\n**Success Rate:** ${totalCommands > 0 ? Math.round((successfulCommands / totalCommands) * 100) : 0}%`,
          inline: true
        },
        {
          name: '🎨 Feature Usage',
          value: `**Background Removals:** ${backgroundRemovals}\n**Sticker Size Requests:** ${stickerSizeRequests}\n**Regular Emojis:** ${successfulCommands - stickerSizeRequests}`,
          inline: true
        },
        {
          name: '⚡ System Info',
          value: `**Uptime:** ${uptimeHours}h ${uptimeMinutes}m\n**Node.js:** ${process.version}\n**Memory:** ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
          inline: true
        },
        {
          name: '🎭 Animation Styles Available',
          value: '🌊 Smooth Motion (Default)\n🎬 Dramatic Motion\n✨ Subtle Motion\n🎭 Live2D Style',
          inline: false
        },
        {
          name: '💡 Features',
          value: '✅ Image to GIF conversion\n✅ Background removal (AI-powered)\n✅ Discord sticker optimization\n✅ Multiple animation styles\n✅ Smart size optimization',
          inline: false
        },
        {
          name: '⏱️ Rate Limits',
          value: `**Current Limit:** ${HOURLY_LIMIT} animations per hour\n**Reset Interval:** Every 60 minutes\n**Purpose:** Keep the bot running smoothly for everyone!`,
          inline: false
        }
      ],
      footer: {
        text: 'Stickerize Bot - Making Discord more animated! 🚀'
      },
      timestamp: new Date().toISOString()
    };

    await interaction.followUp({
      embeds: [statsEmbed]
    });

    fs.appendFileSync('bot-log.txt', 'Stats command completed successfully\n');

  } catch (error) {
    console.error('Error in stats command:', error);
    fs.appendFileSync('bot-log.txt', `Stats command error: ${error.message}\n`);

    try {
      await interaction.followUp({
        content: `An error occurred while fetching statistics: ${error.message}`,
        ephemeral: true
      });
    } catch (followUpError) {
      console.error('Error sending stats follow-up:', followUpError);
    }
  }
}

// Function to remove background from an image using AI
async function removeImageBackgroundWithAI(imagePath, tempDir) {
  try {
    fs.appendFileSync('bot-log.txt', 'Starting background removal with Replicate API\n');

    // Validate API token
    if (!process.env.REPLICATE_API_TOKEN) {
      throw new Error('REPLICATE_API_TOKEN not found in environment variables');
    }

    // Read image file and convert to base64 data URI
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const mimeType = imagePath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
    const dataUri = `data:${mimeType};base64,${base64Image}`;

    fs.appendFileSync('bot-log.txt', `Image size: ${imageBuffer.length} bytes\n`);

    // Try multiple background removal models in order of preference
    const backgroundRemovalModels = [
      {
        name: 'cjwbw/rembg',
        version: 'fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003', // ✅ TESTED AND WORKING
        inputKey: 'image'
      },
      {
        name: 'legacy-851-labs',
        version: 'a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc',
        inputKey: 'image'
      }
    ];

    let lastError = null;

    for (const model of backgroundRemovalModels) {
      try {
        fs.appendFileSync('bot-log.txt', `Trying background removal model: ${model.name}\n`);

        // Call Replicate API for background removal
        const replicateResponse = await axios.post(
          'https://api.replicate.com/v1/predictions',
          {
            version: model.version,
            input: {
              [model.inputKey]: dataUri
            }
          },
          {
            headers: {
              'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
              'Content-Type': 'application/json'
            },
            timeout: 30000 // 30 second timeout
          }
        );

        const predictionId = replicateResponse.data.id;
        fs.appendFileSync('bot-log.txt', `Background removal prediction started with ${model.name}: ${predictionId}\n`);

        // Poll for completion with better error handling
        let prediction;
        let attempts = 0;
        const maxAttempts = 30; // 5 minutes max

        while (attempts < maxAttempts) {
          // Wait before polling (except first attempt)
          if (attempts > 0) {
            await new Promise(resolve => setTimeout(resolve, 10000));
          }

          const pollResponse = await axios.get(
            `https://api.replicate.com/v1/predictions/${predictionId}`,
            {
              headers: {
                'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
                'Content-Type': 'application/json'
              },
              timeout: 15000 // 15 second timeout for polling
            }
          );

          prediction = pollResponse.data;
          fs.appendFileSync('bot-log.txt', `Background removal status (${model.name}): ${prediction.status}\n`);

          if (prediction.status === 'succeeded') {
            break;
          } else if (prediction.status === 'failed') {
            const errorMessage = prediction.error || 'Unknown error';
            fs.appendFileSync('bot-log.txt', `Background removal failed with ${model.name}: ${errorMessage}\n`);
            throw new Error(`Background removal failed: ${errorMessage}`);
          }

          attempts++;
          fs.appendFileSync('bot-log.txt', `Background removal polling attempt ${attempts} for ${model.name}...\n`);
        }

        if (!prediction || prediction.status !== 'succeeded') {
          throw new Error(`Background removal timed out with ${model.name}`);
        }

        // Download the processed image
        const processedImageUrl = prediction.output;
        fs.appendFileSync('bot-log.txt', `Background removed image URL (${model.name}): ${processedImageUrl}\n`);

        const processedResponse = await axios({
          method: 'GET',
          url: processedImageUrl,
          responseType: 'arraybuffer',
          timeout: 30000 // 30 second timeout for download
        });

        // Save the processed image
        const outputPath = path.join(tempDir, `nobg-${path.basename(imagePath)}`);
        fs.writeFileSync(outputPath, processedResponse.data);
        fs.appendFileSync('bot-log.txt', `Background removed image saved (${model.name}): ${outputPath}\n`);

        return outputPath;

      } catch (modelError) {
        lastError = modelError;
        fs.appendFileSync('bot-log.txt', `Model ${model.name} failed: ${modelError.message}\n`);

        // If this is an auth error, don't try other models
        if (modelError.response && modelError.response.status === 401) {
          throw new Error('Authentication failed - check REPLICATE_API_TOKEN');
        }

        // Continue to next model
        continue;
      }
    }

    // If we get here, all models failed
    throw new Error(`All background removal models failed. Last error: ${lastError?.message || 'Unknown error'}`);

  } catch (error) {
    fs.appendFileSync('bot-log.txt', `Background removal error: ${error.message}\n`);

    // If it's a critical error, provide helpful message
    if (error.message.includes('Authentication') || error.message.includes('401')) {
      throw new Error('Background removal authentication failed. Please check your Replicate API token.');
    }

    throw error;
  }
}

// Handle errors
client.on('error', (error) => {
  const message = `Discord client error: ${error.message}`;
  console.error(message);
  fs.appendFileSync('bot-log.txt', message + '\n');
});

process.on('unhandledRejection', (error) => {
  const message = `Unhandled promise rejection: ${error.message}`;
  console.error(message);
  fs.appendFileSync('bot-log.txt', message + '\n');
});

// Login to Discord with your client's token
client.login(process.env.DISCORD_TOKEN)
  .then(() => {
    const message = 'Login successful';
    console.log(message);
    fs.appendFileSync('bot-log.txt', message + '\n');
  })
  .catch(error => {
    const message = `Login failed: ${error.message}`;
    console.error(message);
    fs.appendFileSync('bot-log.txt', message + '\n');
  });
