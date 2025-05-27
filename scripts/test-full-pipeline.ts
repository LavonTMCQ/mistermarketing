import { config } from 'dotenv';
import path from 'path';
import fs from 'fs';
import { generateAnimation } from '../src/services/inferenceService';
import { videoToAPNG } from '../src/utils/apngConverter';
import { validateImage, cropToSquare } from '../src/utils/imageValidator';

// Load environment variables
config();

// Path to the test image
const testImagePath = path.join(__dirname, '../temp/test-image.png');

async function testFullPipeline() {
  try {
    console.log('Starting full pipeline test...');
    
    // Step 1: Validate image
    console.log('Validating image...');
    const imageInfo = await validateImage(testImagePath);
    console.log('Image info:', imageInfo);
    
    let processedImagePath = testImagePath;
    
    if (!imageInfo.isValid) {
      if (imageInfo.errorMessage?.includes('aspect ratio')) {
        console.log('Image has incorrect aspect ratio, cropping...');
        const croppedPath = testImagePath.replace(/\.[^/.]+$/, '.cropped.png');
        await cropToSquare(testImagePath, croppedPath);
        processedImagePath = croppedPath;
        console.log('Image cropped successfully');
      } else {
        throw new Error(imageInfo.errorMessage || 'Invalid image');
      }
    }
    
    // Step 2: Generate animation using Replicate
    console.log('Generating animation...');
    console.log('This may take a minute or two...');
    const videoPath = await generateAnimation(processedImagePath);
    console.log('Animation generated successfully!');
    console.log('Video saved to:', videoPath);
    
    // Step 3: Convert to APNG
    console.log('Converting to APNG...');
    const apngPath = await videoToAPNG(videoPath, videoPath.replace(/\.[^/.]+$/, '.apng'), 8);
    console.log('APNG created successfully!');
    console.log('APNG saved to:', apngPath);
    
    // Step 4: Check file size
    const stats = fs.statSync(apngPath);
    const fileSizeKB = stats.size / 1024;
    console.log(`APNG file size: ${fileSizeKB.toFixed(2)} KB`);
    
    if (fileSizeKB <= 512) {
      console.log('Success! The APNG is under 512KB and ready for Discord.');
    } else {
      console.log('Warning: The APNG is larger than 512KB. It needs further optimization for Discord stickers.');
    }
    
    console.log('Full pipeline test completed successfully!');
    return apngPath;
  } catch (error) {
    console.error('Error in full pipeline test:', error);
    throw error;
  }
}

// Main function
async function main() {
  try {
    await testFullPipeline();
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

// Run the main function
main();
