import { config } from 'dotenv';
import path from 'path';
import { generateAnimation } from '../src/services/inferenceService';

// Load environment variables
config();

// Path to the test image
const testImagePath = path.join(__dirname, '../temp/test-image.png');

async function testReplicate() {
  try {
    console.log('Testing Replicate API with image:', testImagePath);
    
    console.log('Generating animation...');
    console.log('This may take a minute or two...');
    
    const videoPath = await generateAnimation(testImagePath);
    
    console.log('Animation generated successfully!');
    console.log('Video saved to:', videoPath);
    
    return videoPath;
  } catch (error) {
    console.error('Error testing Replicate:', error);
    throw error;
  }
}

// Main function
async function main() {
  try {
    await testReplicate();
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

// Run the main function
main();
