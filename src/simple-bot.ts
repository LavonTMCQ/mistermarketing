import { Client, Events, GatewayIntentBits, Collection, SlashCommandBuilder, CommandInteraction, AttachmentBuilder } from 'discord.js';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { generateAnimation } from './services/inferenceService';
import { videoToAPNG } from './utils/apngConverter';
import { validateImage, cropToSquare } from './utils/imageValidator';

// Load environment variables
config();

console.log('Starting Stickerize Bot...');
console.log('Discord Token:', process.env.DISCORD_TOKEN ? 'Set' : 'Not set');
console.log('Discord Client ID:', process.env.DISCORD_CLIENT_ID ? 'Set' : 'Not set');
console.log('Replicate API Token:', process.env.REPLICATE_API_TOKEN ? 'Set' : 'Not set');

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
});

// Handle errors
client.on('error', (error) => {
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

// Create temp directory if it doesn't exist
const tempDir = path.join(__dirname, '../temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// When the client is ready, run this code (only once)
client.once(Events.ClientReady, (c) => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
});

// Handle interactions (slash commands)
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'stickerize') {
    await handleStickerizeCommand(interaction);
  }
});

// Handle the stickerize command
async function handleStickerizeCommand(interaction: CommandInteraction) {
  await interaction.deferReply();

  try {
    // Get attachments
    const options = interaction.options as any;
    const attachment = options.getAttachment?.('image');

    if (!attachment) {
      await interaction.followUp({
        content: 'Please attach an image to convert.',
        ephemeral: true
      });
      return;
    }

    // Validate attachment
    if (attachment.size > 8 * 1024 * 1024) {
      await interaction.followUp({
        content: `File ${attachment.name} is too large. Maximum size is 8MB.`,
        ephemeral: true
      });
      return;
    }

    const validTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    if (!validTypes.includes(attachment.contentType!)) {
      await interaction.followUp({
        content: `File ${attachment.name} is not a valid image type. Supported types: PNG, JPEG, GIF, WEBP.`,
        ephemeral: true
      });
      return;
    }

    // Process the image
    await interaction.followUp({
      content: `Processing image. This may take up to 60 seconds...`,
      ephemeral: false
    });

    // Download the image
    const imagePath = await downloadImage(attachment.url);

    // Validate and crop if needed
    const imageInfo = await validateImage(imagePath);
    let processedImagePath = imagePath;

    if (!imageInfo.isValid) {
      if (imageInfo.errorMessage?.includes('aspect ratio')) {
        const croppedPath = imagePath.replace(/\.[^/.]+$/, '.cropped.png');
        await cropToSquare(imagePath, croppedPath);
        processedImagePath = croppedPath;
      } else {
        throw new Error(imageInfo.errorMessage || 'Invalid image');
      }
    }

    // Generate animation
    const videoPath = await generateAnimation(processedImagePath);

    // Convert to APNG
    const apngPath = await videoToAPNG(videoPath, videoPath.replace(/\.[^/.]+$/, '.apng'), 8);

    // Send the result
    await interaction.followUp({
      content: 'Here is your animated sticker!',
      files: [new AttachmentBuilder(apngPath)]
    });

    // Clean up temp files
    cleanupFiles([imagePath, processedImagePath, videoPath, apngPath]);
  } catch (error: any) {
    console.error('Error in stickerize command:', error);
    await interaction.followUp({
      content: `An error occurred: ${error.message}`,
      ephemeral: true
    });
  }
}

// Download image from URL
async function downloadImage(url: string): Promise<string> {
  const response = await axios({
    method: 'GET',
    url,
    responseType: 'stream',
  });

  const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.png`;
  const filePath = path.join(tempDir, filename);

  const writer = fs.createWriteStream(filePath);

  return new Promise((resolve, reject) => {
    response.data.pipe(writer);

    writer.on('finish', () => resolve(filePath));
    writer.on('error', reject);
  });
}

// Clean up temporary files
function cleanupFiles(filePaths: string[]): void {
  for (const filePath of filePaths) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

// Login to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);
