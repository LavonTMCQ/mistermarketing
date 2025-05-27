import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { promisify } from 'util';

const stat = promisify(fs.stat);
const mkdir = promisify(fs.mkdir);
const readdir = promisify(fs.readdir);
const unlink = promisify(fs.unlink);

/**
 * Converts a video file to an APNG
 * @param videoPath Path to the input video file
 * @param outputPath Path for the output APNG file
 * @param fps Frames per second (default: 24)
 * @returns Promise that resolves when conversion is complete
 */
export async function videoToAPNG(videoPath: string, outputPath: string, fps: number = 24): Promise<string> {
  try {
    // Create a temporary directory for frames
    const framesDir = path.join(path.dirname(videoPath), 'frames');
    await mkdir(framesDir, { recursive: true });

    // Extract frames from video
    await extractFrames(videoPath, framesDir, fps);

    // Get list of frame files
    const frameFiles = await readdir(framesDir);
    const sortedFrames = frameFiles
      .filter(file => file.endsWith('.png'))
      .sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)?.[0] || '0');
        const numB = parseInt(b.match(/\d+/)?.[0] || '0');
        return numA - numB;
      })
      .map(file => path.join(framesDir, file));

    // Create APNG using apngasm
    await createAPNG(sortedFrames, outputPath, 1000 / fps); // delay in milliseconds

    // Resize to 320x320
    const resizedPath = await resizeAPNG(outputPath, 320, 320);

    // Optimize size
    const optimizedPath = await optimizeAPNG(resizedPath);

    // Clean up temporary files
    await cleanupFrames(framesDir);

    return optimizedPath;
  } catch (error) {
    console.error('Error converting video to APNG:', error);
    throw error;
  }
}

/**
 * Extracts frames from a video file
 * @param videoPath Path to the input video file
 * @param outputDir Directory for the output frames
 * @param fps Frames per second
 * @returns Promise that resolves when extraction is complete
 */
async function extractFrames(videoPath: string, outputDir: string, fps: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-i', videoPath,
      '-vf', `fps=${fps}`,
      '-pix_fmt', 'rgba',
      path.join(outputDir, 'frame%04d.png')
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

/**
 * Creates an APNG file from a list of frames using ffmpeg
 * @param frameFiles Array of paths to frame files
 * @param outputPath Path for the output APNG file
 * @param delay Delay between frames in milliseconds
 * @returns Promise that resolves when APNG creation is complete
 */
async function createAPNG(frameFiles: string[], outputPath: string, delay: number): Promise<void> {
  return new Promise((resolve, reject) => {
    // Create a temporary file with the list of frames
    const framesListPath = path.join(path.dirname(frameFiles[0]), 'frames_list.txt');
    const framesList = frameFiles.map(file => `file '${file}'`).join('\n');
    fs.writeFileSync(framesListPath, framesList);

    // Calculate framerate from delay
    const framerate = Math.round(1000 / delay);

    // Use ffmpeg to create an animated PNG
    const ffmpeg = spawn('ffmpeg', [
      '-f', 'concat',
      '-safe', '0',
      '-i', framesListPath,
      '-framerate', framerate.toString(),
      '-plays', '0', // Loop forever
      '-f', 'apng',
      '-y',
      outputPath
    ]);

    ffmpeg.on('close', (code) => {
      // Clean up the frames list file
      if (fs.existsSync(framesListPath)) {
        fs.unlinkSync(framesListPath);
      }

      if (code !== 0) {
        reject(new Error(`ffmpeg exited with code ${code}`));
        return;
      }

      resolve();
    });

    ffmpeg.on('error', (err) => {
      // Clean up the frames list file
      if (fs.existsSync(framesListPath)) {
        fs.unlinkSync(framesListPath);
      }

      reject(err);
    });
  });
}

/**
 * Resizes an APNG file
 * @param inputPath Path to the input APNG file
 * @param width Target width
 * @param height Target height
 * @returns Promise that resolves with the path to the resized file
 */
async function resizeAPNG(inputPath: string, width: number, height: number): Promise<string> {
  const outputPath = inputPath.replace('.apng', '.resized.apng');

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-i', inputPath,
      '-vf', `scale=${width}:${height}`,
      '-y',
      outputPath
    ]);

    ffmpeg.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffmpeg exited with code ${code}`));
        return;
      }

      resolve(outputPath);
    });

    ffmpeg.on('error', reject);
  });
}

/**
 * Optimizes an APNG file to reduce size using ffmpeg
 * @param inputPath Path to the input APNG file
 * @returns Promise that resolves with the path to the optimized file
 */
async function optimizeAPNG(inputPath: string): Promise<string> {
  const outputPath = inputPath.replace('.resized.apng', '.optimized.apng');

  // Check if file is already under 512KB
  const stats = await stat(inputPath);
  if (stats.size <= 512 * 1024) {
    // Just copy the file
    fs.copyFileSync(inputPath, outputPath);
    return outputPath;
  }

  // Try to optimize with ffmpeg by reducing quality
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-i', inputPath,
      '-vf', 'scale=320:320:flags=lanczos',
      '-quality', '60',
      '-f', 'apng',
      '-y',
      outputPath
    ]);

    ffmpeg.on('close', async (code) => {
      // Check if optimization was successful and file is under 512KB
      try {
        if (code !== 0) {
          // If ffmpeg fails, just copy the file
          fs.copyFileSync(inputPath, outputPath);
        }

        const optimizedStats = await stat(outputPath);
        if (optimizedStats.size <= 512 * 1024) {
          resolve(outputPath);
        } else {
          // Try more aggressive optimization
          const moreOptimizedPath = await moreAggressiveOptimization(outputPath);
          resolve(moreOptimizedPath);
        }
      } catch (error) {
        reject(error);
      }
    });

    ffmpeg.on('error', reject);
  });
}

/**
 * Applies more aggressive optimization to reduce file size
 * @param inputPath Path to the input APNG file
 * @returns Promise that resolves with the path to the optimized file
 */
async function moreAggressiveOptimization(inputPath: string): Promise<string> {
  const outputPath = inputPath.replace('.optimized.apng', '.final.apng');

  // Try with more aggressive settings
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-i', inputPath,
      '-vf', 'scale=240:240:flags=lanczos', // Reduce size further
      '-quality', '30',
      '-f', 'apng',
      '-y',
      outputPath
    ]);

    ffmpeg.on('close', async (code) => {
      try {
        if (code !== 0) {
          // If ffmpeg fails, just copy the file
          fs.copyFileSync(inputPath, outputPath);
        }

        const finalStats = await stat(outputPath);
        if (finalStats.size <= 512 * 1024) {
          resolve(outputPath);
        } else {
          // If still too large, reduce number of frames
          const reducedFramesPath = await reduceFrames(inputPath);
          resolve(reducedFramesPath);
        }
      } catch (error) {
        reject(error);
      }
    });

    ffmpeg.on('error', reject);
  });
}

/**
 * Reduces the number of frames in an APNG to decrease file size
 * @param inputPath Path to the input APNG file
 * @returns Promise that resolves with the path to the reduced file
 */
async function reduceFrames(inputPath: string): Promise<string> {
  const outputPath = inputPath.replace('.final.apng', '.reduced.apng');

  // Extract frames to a temporary directory
  const framesDir = path.join(path.dirname(inputPath), 'reduced_frames');
  await mkdir(framesDir, { recursive: true });

  try {
    // Extract frames
    await new Promise<void>((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-i', inputPath,
        '-vf', 'select=not(mod(n\\,2))', // Take every other frame
        path.join(framesDir, 'frame%04d.png')
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

    // Get list of frame files
    const frameFiles = await readdir(framesDir);
    const sortedFrames = frameFiles
      .filter(file => file.endsWith('.png'))
      .sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)?.[0] || '0');
        const numB = parseInt(b.match(/\d+/)?.[0] || '0');
        return numA - numB;
      })
      .map(file => path.join(framesDir, file));

    if (sortedFrames.length === 0) {
      // If no frames were extracted, just return the input path
      return inputPath;
    }

    // Create a new APNG with fewer frames
    await createAPNG(sortedFrames, outputPath, 125); // 8 fps

    // Clean up temporary files
    await cleanupFrames(framesDir);

    // Check if the reduced file is under 512KB
    const stats = await stat(outputPath);
    if (stats.size <= 512 * 1024) {
      return outputPath;
    } else {
      // If still too large, just return the input path
      // In a real implementation, you might want to try other strategies
      return inputPath;
    }
  } catch (error) {
    console.error('Error reducing frames:', error);
    return inputPath;
  }
}

/**
 * Cleans up temporary frame files
 * @param framesDir Directory containing frame files
 */
async function cleanupFrames(framesDir: string): Promise<void> {
  try {
    const files = await readdir(framesDir);

    // Delete each frame file
    for (const file of files) {
      await unlink(path.join(framesDir, file));
    }

    // Remove the directory
    fs.rmdirSync(framesDir);
  } catch (error) {
    console.error('Error cleaning up frames:', error);
    // Don't throw, just log the error
  }
}
