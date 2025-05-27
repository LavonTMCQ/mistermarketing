import { Pool } from 'pg';
import { config } from 'dotenv';

// Load environment variables
config();

// Create a new pool instance
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Initialize database tables
export async function setupDatabase() {
  try {
    // Create usage table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usage (
        id SERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        image_count INTEGER NOT NULL,
        gpu_minutes FLOAT NOT NULL,
        cost FLOAT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create errors table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS errors (
        id SERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        error_message TEXT NOT NULL,
        stack_trace TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create guild_settings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS guild_settings (
        guild_id TEXT PRIMARY KEY,
        quota INTEGER DEFAULT 100,
        usage INTEGER DEFAULT 0,
        last_reset TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Database tables initialized');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Log usage
export async function logUsage(guildId: string, userId: string, imageCount: number, gpuMinutes: number, cost: number) {
  try {
    await pool.query(
      'INSERT INTO usage (guild_id, user_id, image_count, gpu_minutes, cost) VALUES ($1, $2, $3, $4, $5)',
      [guildId, userId, imageCount, gpuMinutes, cost]
    );

    // Update guild usage
    await pool.query(
      'INSERT INTO guild_settings (guild_id, usage) VALUES ($1, $2) ON CONFLICT (guild_id) DO UPDATE SET usage = guild_settings.usage + $2',
      [guildId, imageCount]
    );
  } catch (error) {
    console.error('Error logging usage:', error);
    throw error;
  }
}

// Log error
export async function logError(guildId: string, userId: string, errorMessage: string, stackTrace?: string) {
  try {
    await pool.query(
      'INSERT INTO errors (guild_id, user_id, error_message, stack_trace) VALUES ($1, $2, $3, $4)',
      [guildId, userId, errorMessage, stackTrace]
    );
  } catch (error) {
    console.error('Error logging error:', error);
    // Don't throw here to prevent cascading errors
  }
}

// Get guild stats
export async function getGuildStats(guildId: string) {
  try {
    const result = await pool.query(
      'SELECT * FROM guild_settings WHERE guild_id = $1',
      [guildId]
    );

    if (result.rows.length === 0) {
      // Create default settings if not exists
      await pool.query(
        'INSERT INTO guild_settings (guild_id) VALUES ($1)',
        [guildId]
      );
      return { quota: 100, usage: 0, last_reset: new Date() };
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error getting guild stats:', error);
    throw error;
  }
}

// Reset guild usage
export async function resetGuildUsage(guildId: string) {
  try {
    await pool.query(
      'UPDATE guild_settings SET usage = 0, last_reset = CURRENT_TIMESTAMP WHERE guild_id = $1',
      [guildId]
    );
  } catch (error) {
    console.error('Error resetting guild usage:', error);
    throw error;
  }
}

// Set guild quota
export async function setGuildQuota(guildId: string, quota: number) {
  try {
    await pool.query(
      'INSERT INTO guild_settings (guild_id, quota) VALUES ($1, $2) ON CONFLICT (guild_id) DO UPDATE SET quota = $2',
      [guildId, quota]
    );
  } catch (error) {
    console.error('Error setting guild quota:', error);
    throw error;
  }
}

export default pool;
