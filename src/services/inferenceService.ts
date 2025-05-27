import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { config } from 'dotenv';

// Load environment variables
config();

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);

// Inference service URL
const INFERENCE_SERVICE_URL = process.env.INFERENCE_SERVICE_URL || 'http://localhost:7860';
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

/**
 * Generates an animation from an image using the local inference service
 * @param imagePath Path to the input image
 * @returns Promise that resolves with the path to the generated video
 */
export async function generateAnimationLocal(imagePath: string): Promise<string> {
  try {
    // Read image file as base64
    const imageBuffer = await readFile(imagePath);
    const base64Image = imageBuffer.toString('base64');

    // Call the local inference service (ComfyUI)
    const response = await axios.post(`${INFERENCE_SERVICE_URL}/api/predict`, {
      prompt: {
        image: base64Image,
        frames: 16,
        fps: 8
      }
    });

    // Check if the response contains a video URL
    if (!response.data.video_url) {
      throw new Error('No video URL in response');
    }

    // Download the video
    const videoResponse = await axios({
      method: 'GET',
      url: response.data.video_url,
      responseType: 'arraybuffer'
    });

    // Save the video
    const videoPath = imagePath.replace(/\.[^/.]+$/, '.mp4');
    await writeFile(videoPath, videoResponse.data);

    return videoPath;
  } catch (error) {
    console.error('Error generating animation locally:', error);

    // Try fallback to Replicate if available
    if (REPLICATE_API_TOKEN) {
      console.log('Falling back to Replicate API');
      return generateAnimationReplicate(imagePath);
    }

    throw error;
  }
}

/**
 * Generates an animation from an image using the Replicate API
 * @param imagePath Path to the input image
 * @returns Promise that resolves with the path to the generated video
 */
export async function generateAnimationReplicate(imagePath: string): Promise<string> {
  if (!REPLICATE_API_TOKEN) {
    throw new Error('Replicate API token not configured');
  }

  try {
    // Read image file as base64
    const imageBuffer = await readFile(imagePath);
    const base64Image = imageBuffer.toString('base64');

    // Start prediction
    const startResponse = await axios.post(
      'https://api.replicate.com/v1/predictions',
      {
        version: 'd68b6e09eedbac7a49e3d8644999d93579c386a083768235cabca88796d70d82',
        input: {
          input_image: `data:image/png;base64,${base64Image}`,
          motion_bucket_id: 127,
          fps: 8,
          num_frames: 16
        }
      },
      {
        headers: {
          'Authorization': `Token ${REPLICATE_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const predictionId = startResponse.data.id;

    // Poll for completion
    let prediction;
    let attempts = 0;
    const maxAttempts = 30; // 5 minutes max (10 seconds per attempt)

    while (attempts < maxAttempts) {
      const pollResponse = await axios.get(
        `https://api.replicate.com/v1/predictions/${predictionId}`,
        {
          headers: {
            'Authorization': `Token ${REPLICATE_API_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );

      prediction = pollResponse.data;

      if (prediction.status === 'succeeded') {
        break;
      } else if (prediction.status === 'failed') {
        throw new Error(`Replicate prediction failed: ${prediction.error}`);
      }

      // Wait 10 seconds before polling again
      await new Promise(resolve => setTimeout(resolve, 10000));
      attempts++;
    }

    if (!prediction || prediction.status !== 'succeeded') {
      throw new Error('Prediction timed out or failed');
    }

    // Download the video
    const videoUrl = prediction.output;
    const videoResponse = await axios({
      method: 'GET',
      url: videoUrl,
      responseType: 'arraybuffer'
    });

    // Save the video
    const videoPath = imagePath.replace(/\.[^/.]+$/, '.mp4');
    await writeFile(videoPath, videoResponse.data);

    return videoPath;
  } catch (error) {
    console.error('Error generating animation with Replicate:', error);
    throw error;
  }
}

/**
 * Generates an animation from an image
 * @param imagePath Path to the input image
 * @returns Promise that resolves with the path to the generated video
 */
export async function generateAnimation(imagePath: string): Promise<string> {
  // Since we have a Replicate API token, use it directly
  if (REPLICATE_API_TOKEN) {
    console.log('Using Replicate API for inference');
    return generateAnimationReplicate(imagePath);
  } else {
    // Try local inference as fallback
    try {
      return await generateAnimationLocal(imagePath);
    } catch (error) {
      console.error('Inference failed:', error);
      throw new Error('No inference methods available');
    }
  }
}
