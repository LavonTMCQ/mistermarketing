import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { validateImage, cropToSquare } from '../src/utils/imageValidator';
import { videoToAPNG } from '../src/utils/apngConverter';
import { generateAnimation } from '../src/services/inferenceService';

// Load environment variables
config();

// Create temp directory if it doesn't exist
const tempDir = path.join(__dirname, '../temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

async function testImageProcessing(imagePath: string) {
  try {
    console.log(`Testing image processing for: ${imagePath}`);
    
    // Step 1: Validate image
    console.log('Validating image...');
    const imageInfo = await validateImage(imagePath);
    console.log('Image info:', imageInfo);
    
    if (!imageInfo.isValid) {
      if (imageInfo.errorMessage?.includes('aspect ratio')) {
        console.log('Image has incorrect aspect ratio, cropping...');
        const croppedPath = imagePath.replace(/\.[^/.]+$/, '.cropped.png');
        await cropToSquare(imagePath, croppedPath);
        imagePath = croppedPath;
        console.log('Image cropped successfully');
      } else {
        throw new Error(imageInfo.errorMessage || 'Invalid image');
      }
    }
    
    // Step 2: Generate animation
    console.log('Generating animation...');
    const videoPath = await generateAnimation(imagePath);
    console.log('Animation generated:', videoPath);
    
    // Step 3: Convert to APNG
    console.log('Converting to APNG...');
    const apngPath = await videoToAPNG(videoPath, videoPath.replace(/\.[^/.]+$/, '.apng'), 8);
    console.log('APNG created:', apngPath);
    
    console.log('Processing completed successfully!');
    return apngPath;
  } catch (error) {
    console.error('Error processing image:', error);
    throw error;
  }
}

// Main function
async function main() {
  if (process.argv.length < 3) {
    console.error('Please provide an image path');
    process.exit(1);
  }
  
  const imagePath = process.argv[2];
  
  try {
    await testImageProcessing(imagePath);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

// Run the main function
main();
