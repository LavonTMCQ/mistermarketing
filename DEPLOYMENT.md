# Stickerize Bot Deployment Guide

This guide explains how to run the Stickerize bot locally and deploy it to Railway for 24/7 access.

## Table of Contents
- [Running the Bot Locally](#running-the-bot-locally)
- [Deploying to Railway](#deploying-to-railway)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)

## Running the Bot Locally

### Prerequisites
- Node.js 16+ installed
- Discord bot token (from [Discord Developer Portal](https://discord.com/developers/applications))
- Replicate API token (from [Replicate](https://replicate.com/))
- ffmpeg installed on your system

### Steps to Run Locally

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/stickersdisc.git
   cd stickersdisc
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory with the following content:
   ```
   DISCORD_TOKEN=your_discord_bot_token
   DISCORD_CLIENT_ID=your_discord_client_id
   REPLICATE_API_TOKEN=your_replicate_api_token
   ```

4. **Register slash commands**
   ```bash
   npm run register-simple
   ```

5. **Start the bot**
   ```bash
   npm run logging-bot
   ```

The bot should now be running and will log its activity to the console and to `bot-log.txt`.

## Deploying to Railway

Railway is a platform that allows you to deploy and host applications with ease. Here's how to deploy the Stickerize bot to Railway for 24/7 access:

### Prerequisites
- [Railway account](https://railway.app/)
- Git repository with your bot code (GitHub, GitLab, etc.)

### Steps to Deploy

1. **Push your code to a Git repository**
   ```bash
   git add .
   git commit -m "Prepare for Railway deployment"
   git push
   ```

2. **Create a new project on Railway**
   - Go to [Railway Dashboard](https://railway.app/dashboard)
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Connect your GitHub account if not already connected
   - Select your repository

3. **Configure the project**
   - Once the project is created, go to the "Variables" tab
   - Add the following environment variables:
     - `DISCORD_TOKEN`: Your Discord bot token
     - `DISCORD_CLIENT_ID`: Your Discord application client ID
     - `REPLICATE_API_TOKEN`: Your Replicate API token

4. **Set up the build and start commands**
   - Railway will automatically detect the build and start commands from package.json
   - The start command is set to: `npm run register-simple && npm run logging-bot`
   - If needed, you can override in the "Settings" tab under "Deploy"

5. **Deploy the project**
   - Railway will automatically deploy your project when you push changes to your repository
   - You can also manually deploy from the "Deployments" tab

6. **Monitor your bot**
   - Go to the "Deployments" tab to see the deployment status
   - Click on a deployment to view logs

Your bot should now be running 24/7 on Railway!

## Environment Variables

Here's a description of all the environment variables used by the bot:

| Variable | Description |
|----------|-------------|
| `DISCORD_TOKEN` | Your Discord bot token from the Discord Developer Portal |
| `DISCORD_CLIENT_ID` | Your Discord application client ID |
| `REPLICATE_API_TOKEN` | Your Replicate API token for generating animations |

## Troubleshooting

### Bot not responding to commands
- Make sure the bot is online in Discord
- Check if the slash commands are registered (`npm run register-simple`)
- Verify that the bot has the correct permissions in your Discord server

### Railway deployment issues
- Check the deployment logs for errors
- Make sure all environment variables are set correctly
- Verify that the build and start commands are correct

### Animation generation issues
- Check if your Replicate API token is valid
- Make sure the input image is in a supported format (PNG, JPEG, GIF, WEBP)
- Check the bot logs for specific error messages

## Railway-Specific Setup Instructions

### Quick Deploy to Railway

1. **Fork or clone this repository to your GitHub account**

2. **Get your Discord Bot credentials:**
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Create a new application or select an existing one
   - Go to the "Bot" section and copy your bot token
   - Go to "OAuth2" > "General" and copy your Client ID

3. **Get your Replicate API token:**
   - Sign up at [Replicate](https://replicate.com/)
   - Go to your account settings and create an API token

4. **Deploy to Railway:**
   - Click this button: [![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template)
   - Or manually:
     - Go to [Railway Dashboard](https://railway.app/dashboard)
     - Click "New Project" > "Deploy from GitHub repo"
     - Select your forked repository
     - Railway will automatically detect the configuration

5. **Set Environment Variables in Railway:**
   - Go to your project's "Variables" tab
   - Add these variables:
     ```
     DISCORD_TOKEN=your_discord_bot_token_here
     DISCORD_CLIENT_ID=your_discord_client_id_here
     REPLICATE_API_TOKEN=your_replicate_api_token_here
     ```

6. **Deploy and Monitor:**
   - Railway will automatically build and deploy your bot
   - Check the "Deployments" tab for build logs
   - Your bot should be online within 2-3 minutes

### Verifying Deployment

1. **Check the deployment logs:**
   - Go to Railway dashboard > Your project > Deployments
   - Click on the latest deployment to view logs
   - Look for "Ready! Logged in as [BotName]" message

2. **Test the bot in Discord:**
   - Invite your bot to a Discord server with appropriate permissions
   - Use the `/stickerize` command with an image
   - The bot should respond and process the image

3. **Monitor usage:**
   - Check Railway logs for any errors
   - Monitor your Replicate API usage
   - Bot logs are available in Railway's deployment logs

## Additional Notes

- The bot uses ffmpeg for image and video processing, which is included in Railway's environment by default
- The bot stores temporary files in the `temp` directory, which is cleaned up automatically
- All bot activity is logged and visible in Railway's deployment logs
- Railway provides automatic SSL and domain management
- The bot will automatically restart if it crashes (configured in railway.json)

## Cost Considerations

- **Railway**: Free tier includes 500 hours/month, then $5/month for the Hobby plan
- **Replicate API**: Pay-per-use, approximately $0.02-0.05 per image animation
- **Discord**: Free to use

## Scaling and Performance

- Railway automatically handles scaling based on usage
- For high-volume usage, consider upgrading to Railway's Pro plan
- Monitor Replicate API costs and consider implementing usage limits

For more information or support, please open an issue on the GitHub repository.
