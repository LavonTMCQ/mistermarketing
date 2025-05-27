import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);

// Create temp directory if it doesn't exist
const tempDir = path.join(__dirname, '../temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

async function downloadImage(url: string, outputPath: string): Promise<void> {
  try {
    console.log(`Downloading image from ${url}...`);
    
    const response = await axios({
      method: 'GET',
      url,
      responseType: 'arraybuffer'
    });
    
    await writeFile(outputPath, response.data);
    
    console.log(`Image saved to ${outputPath}`);
  } catch (error) {
    console.error('Error downloading image:', error);
    throw error;
  }
}

// Main function
async function main() {
  // URL of a sample image (a simple emoji or icon works well for testing)
  const imageUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/SNice.svg/1200px-SNice.svg.png';
  const outputPath = path.join(tempDir, 'test-image.png');
  
  try {
    await downloadImage(imageUrl, outputPath);
    console.log('Download completed successfully!');
  } catch (error) {
    console.error('Download failed:', error);
    process.exit(1);
  }
}

// Run the main function
main();
