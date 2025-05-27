import fs from 'fs';
import { spawn } from 'child_process';
import { promisify } from 'util';

const stat = promisify(fs.stat);

interface ImageInfo {
  width: number;
  height: number;
  format: string;
  aspectRatio: number;
  isValid: boolean;
  errorMessage?: string;
}

/**
 * Validates an image file
 * @param filePath Path to the image file
 * @returns Promise with image information
 */
export async function validateImage(filePath: string): Promise<ImageInfo> {
  try {
    // Check if file exists
    const stats = await stat(filePath);
    
    // Check file size (max 8MB)
    const maxSize = 8 * 1024 * 1024; // 8MB
    if (stats.size > maxSize) {
      return {
        width: 0,
        height: 0,
        format: '',
        aspectRatio: 0,
        isValid: false,
        errorMessage: `File is too large (${(stats.size / 1024 / 1024).toFixed(2)}MB). Maximum size is 8MB.`
      };
    }
    
    // Get image dimensions using ffprobe
    const dimensions = await getImageDimensions(filePath);
    
    // Calculate aspect ratio
    const aspectRatio = dimensions.width / dimensions.height;
    
    // Check if aspect ratio is approximately 1:1 (between 0.9 and 1.1)
    const isValidRatio = aspectRatio >= 0.9 && aspectRatio <= 1.1;
    
    return {
      width: dimensions.width,
      height: dimensions.height,
      format: dimensions.format,
      aspectRatio,
      isValid: isValidRatio,
      errorMessage: isValidRatio ? undefined : 'Image should have an approximately square aspect ratio (1:1).'
    };
  } catch (error: any) {
    return {
      width: 0,
      height: 0,
      format: '',
      aspectRatio: 0,
      isValid: false,
      errorMessage: `Error validating image: ${error.message}`
    };
  }
}

/**
 * Gets image dimensions using ffprobe
 * @param filePath Path to the image file
 * @returns Promise with width, height, and format
 */
async function getImageDimensions(filePath: string): Promise<{ width: number; height: number; format: string }> {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height,codec_name',
      '-of', 'json',
      filePath
    ]);
    
    let output = '';
    
    ffprobe.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    ffprobe.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffprobe exited with code ${code}`));
        return;
      }
      
      try {
        const json = JSON.parse(output);
        const stream = json.streams[0];
        
        resolve({
          width: stream.width,
          height: stream.height,
          format: stream.codec_name
        });
      } catch (error) {
        reject(error);
      }
    });
    
    ffprobe.on('error', reject);
  });
}

/**
 * Crops an image to a square aspect ratio
 * @param inputPath Path to the input image
 * @param outputPath Path for the output image
 * @returns Promise that resolves when cropping is complete
 */
export async function cropToSquare(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-i', inputPath,
      '-vf', 'crop=min(iw\\,ih):min(iw\\,ih)',
      '-y',
      outputPath
    ]);
    
    ffmpeg.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffmpeg exited with code ${code}`));
        return;
      }
      
      resolve();
    });
    
    ffmpeg.on('error', reject);
  });
}
