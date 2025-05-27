import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { config } from 'dotenv';
import { processImage } from './imageProcessor';
import { logError } from './database';

// Load environment variables
config();

// Create Redis connection
const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Create a queue
const imageQueue = new Queue('image-processing', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  },
});

// Job data interface
export interface ImageJobData {
  imageUrl: string;
  userId: string;
  guildId: string;
  interactionId: string;
  interactionToken: string;
}

// Setup worker
export async function setupQueue() {
  const worker = new Worker('image-processing', async (job: Job<ImageJobData>) => {
    try {
      console.log(`Processing job ${job.id}: ${job.data.imageUrl}`);

      // Process the image
      const result = await processImage(job.data);

      return result;
    } catch (error: any) {
      console.error(`Error processing job ${job.id}:`, error);

      // Log error to database
      await logError(
        job.data.guildId,
        job.data.userId,
        error.message || 'Unknown error',
        error.stack
      );

      throw error;
    }
  }, { connection: redisConnection });

  // Handle worker events
  worker.on('completed', (job: Job<ImageJobData>) => {
    console.log(`Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job: Job<ImageJobData> | undefined, error: Error) => {
    console.error(`Job ${job?.id || 'unknown'} failed:`, error);
  });

  console.log('Image processing worker started');
}

// Add job to queue
export async function addImageToQueue(data: ImageJobData): Promise<string> {
  const job = await imageQueue.add('process-image', data);
  return job.id || 'unknown';
}

export default imageQueue;
