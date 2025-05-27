import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { ImageJobData } from './queue';
import { logUsage } from './database';
import { REST, Routes } from '@discordjs/rest';
import { config } from 'dotenv';
import { validateImage as validateImageUtil, cropToSquare } from '../utils/imageValidator';
import { videoToAPNG } from '../utils/apngConverter';
import { generateAnimation as generateAnimationService } from './inferenceService';

// Load environment variables
config();

// Create temp directory if it doesn't exist
const tempDir = path.join(__dirname, '../../temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Discord REST API client
const rest = new REST().setToken(process.env.DISCORD_TOKEN!);

// Process image
export async function processImage(jobData: ImageJobData): Promise<string> {
  const { imageUrl, userId, guildId, interactionId, interactionToken } = jobData;

  try {
    // Download the image
    const imagePath = await downloadImage(imageUrl);

    // Validate image
    await validateImage(imagePath);

    // Generate animation using inference service
    const videoPath = await generateAnimation(imagePath);

    // Convert to APNG
    const apngPath = await convertToAPNG(videoPath);

    // Optimize size
    const optimizedPath = await optimizeSize(apngPath);

    // Upload result back to Discord
    const resultUrl = await uploadToDiscord(optimizedPath, interactionId, interactionToken);

    // Log usage
    // Assuming 0.5 GPU minutes per image and $0.22 per run
    await logUsage(guildId, userId, 1, 0.5, 0.22);

    // Clean up temp files
    cleanupFiles([imagePath, videoPath, apngPath, optimizedPath]);

    return resultUrl;
  } catch (error: any) {
    console.error('Error processing image:', error);

    // Notify user of error
    await sendErrorMessage(interactionId, interactionToken, error.message);

    throw error;
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

// Validate image (size, ratio, etc.)
async function validateImage(imagePath: string): Promise<void> {
  const imageInfo = await validateImageUtil(imagePath);

  if (!imageInfo.isValid) {
    if (imageInfo.errorMessage?.includes('aspect ratio')) {
      // Auto-crop if the aspect ratio is wrong
      const croppedPath = imagePath.replace('.png', '.cropped.png');
      await cropToSquare(imagePath, croppedPath);

      // Replace the original file with the cropped one
      fs.renameSync(croppedPath, imagePath);
    } else {
      throw new Error(imageInfo.errorMessage || 'Invalid image');
    }
  }
}

// Generate animation using inference service
async function generateAnimation(imagePath: string): Promise<string> {
  return generateAnimationService(imagePath);
}

// Convert video to APNG
async function convertToAPNG(videoPath: string): Promise<string> {
  return videoToAPNG(videoPath, videoPath.replace('.mp4', '.apng'), 8);
}

// Optimize APNG size is now handled by the videoToAPNG function
async function optimizeSize(apngPath: string): Promise<string> {
  // The optimization is already done in the videoToAPNG function
  return apngPath;
}

// Upload result to Discord
async function uploadToDiscord(filePath: string, interactionId: string, interactionToken: string): Promise<string> {
  // Create a FormData-like object for the file upload
  const formData = new FormData();
  const fileBlob = new Blob([fs.readFileSync(filePath)]);
  formData.append('files[0]', fileBlob, path.basename(filePath));

  // Send follow-up message with the file
  await rest.post(
    Routes.webhookMessage(interactionId, interactionToken),
    {
      body: {
        content: 'Here is your animated sticker!',
        files: [{ name: path.basename(filePath), attachment: filePath }],
      },
    }
  );

  return 'Sticker sent successfully';
}

// Send error message to user
async function sendErrorMessage(interactionId: string, interactionToken: string, errorMessage: string): Promise<void> {
  await rest.post(
    Routes.webhookMessage(interactionId, interactionToken),
    {
      body: {
        content: `Error creating sticker: ${errorMessage}`,
        ephemeral: true,
      },
    }
  );
}

// Clean up temporary files
function cleanupFiles(filePaths: string[]): void {
  for (const filePath of filePaths) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}
