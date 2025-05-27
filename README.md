# Stickerize Bot

A Discord bot that converts images to animated stickers using state-of-the-art video diffusion models.

## Features

- `/stickerize` command to convert images to animated stickers
- Supports up to 3 images per request
- Validates input images for size and format
- Converts output to Discord-compatible APNG format (320×320px, ≤512KB)
- Admin commands for usage statistics and quota management

## Requirements

- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- GPU for inference (RTX 3060 12GB or equivalent recommended)

## Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Copy `.env.example` to `.env` and fill in your configuration
4. Create a Discord application and bot at https://discord.com/developers/applications
5. Invite the bot to your server with the appropriate permissions
6. Set up PostgreSQL and Redis
7. Build the project:
   ```
   npm run build
   ```
8. Register slash commands:
   ```
   npm run register
   ```
9. Start the bot:
   ```
   npm start
   ```

## Commands

- `/stickerize` - Convert an image to an animated sticker
  - `image_1` - The first image to convert (required)
  - `image_2` - The second image to convert (optional)
  - `image_3` - The third image to convert (optional)

- `/stickerize-stats view` - View current usage statistics
- `/stickerize-stats reset` - Reset usage counter (Admin only)
- `/stickerize-stats quota <amount>` - Set monthly quota (Admin only)

## Architecture

The bot uses a queue-based architecture to process images asynchronously:

1. User submits an image via the `/stickerize` command
2. Image is validated and added to a Redis queue
3. Worker processes the image:
   - Generates animation using AnimateDiff or Replicate API
   - Converts to APNG format with ffmpeg and apngasm
   - Optimizes size to meet Discord's requirements
4. Result is sent back to the user
5. Usage statistics are logged to PostgreSQL

## License

MIT
