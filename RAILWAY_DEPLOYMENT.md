# 🚀 Deploy Stickerize Bot to Railway

This guide will help you deploy your Stickerize Discord bot to Railway for 24/7 operation.

## 🎯 Quick Start

### 1. Prerequisites
- GitHub account
- Discord bot token and client ID
- Replicate API token
- Railway account (free tier available)

### 2. One-Click Deploy
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/yourusername/stickersdisc)

### 3. Manual Deployment Steps

#### Step 1: Prepare Your Repository
```bash
# Make sure all files are committed
git add .
git commit -m "Prepare for Railway deployment"
git push origin main
```

#### Step 2: Create Railway Project
1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository
5. Railway will automatically detect the configuration

#### Step 3: Configure Environment Variables
In Railway dashboard, go to your project → Variables tab and add:

```
DISCORD_TOKEN=your_discord_bot_token_here
DISCORD_CLIENT_ID=your_discord_client_id_here
REPLICATE_API_TOKEN=your_replicate_api_token_here
```

#### Step 4: Deploy
Railway will automatically build and deploy your bot. The process takes 2-3 minutes.

## 🔧 Configuration Files

The following files have been configured for Railway deployment:

- `railway.json` - Railway-specific configuration
- `Procfile` - Process definition for Railway
- `.railwayignore` - Files to exclude from deployment
- `package.json` - Updated with Railway-compatible start script

## 📊 Monitoring Your Deployment

### Check Deployment Status
1. Go to Railway dashboard → Your project → Deployments
2. Click on the latest deployment to view logs
3. Look for "Ready! Logged in as [BotName]" message

### Test the Bot
1. Invite your bot to a Discord server
2. Use `/stickerize` command with an image
3. Bot should respond and process the image

### Monitor Logs
- All bot activity is logged in Railway's deployment logs
- Check for any errors or issues
- Monitor Replicate API usage

## 💰 Cost Breakdown

### Railway Costs
- **Free Tier**: 500 hours/month (enough for 24/7 operation)
- **Hobby Plan**: $5/month for unlimited hours
- **Pro Plan**: $20/month for advanced features

### Replicate API Costs
- **Stable Video Diffusion**: ~$0.02-0.05 per image
- **Monthly estimate**: $10-50 depending on usage

### Total Monthly Cost
- **Light usage**: Free (Railway) + $5-15 (Replicate) = $5-15/month
- **Heavy usage**: $5 (Railway) + $20-50 (Replicate) = $25-55/month

## 🚨 Troubleshooting

### Bot Not Starting
1. Check environment variables are set correctly
2. Verify Discord token is valid
3. Check deployment logs for errors

### Commands Not Working
1. Ensure bot has proper permissions in Discord server
2. Check if commands were registered successfully
3. Verify bot is online in Discord

### Image Processing Errors
1. Check Replicate API token is valid
2. Monitor Replicate API quotas
3. Verify image format is supported

### Common Error Messages
- `Invalid token`: Check DISCORD_TOKEN
- `Missing permissions`: Invite bot with proper permissions
- `Replicate API error`: Check REPLICATE_API_TOKEN and quotas

## 🔄 Updates and Maintenance

### Updating the Bot
1. Make changes to your code
2. Commit and push to GitHub
3. Railway automatically redeploys

### Monitoring Performance
- Check Railway metrics for CPU/memory usage
- Monitor Replicate API usage and costs
- Review bot logs for errors

### Scaling
- Railway automatically handles basic scaling
- For high volume, consider upgrading to Pro plan
- Implement rate limiting to control costs

## 🛡️ Security Best Practices

1. **Never commit tokens to Git**
   - Use Railway environment variables
   - Keep .env file in .gitignore

2. **Monitor API usage**
   - Set up Replicate usage alerts
   - Implement usage limits in bot

3. **Regular updates**
   - Keep dependencies updated
   - Monitor for security vulnerabilities

## 📈 Next Steps

Once deployed, consider these enhancements:
1. Add usage analytics
2. Implement user quotas
3. Add more animation models
4. Create a web dashboard
5. Add premium features

## 🆘 Support

If you encounter issues:
1. Check Railway deployment logs
2. Review this troubleshooting guide
3. Open an issue on GitHub
4. Join our Discord support server

---

**Ready to deploy?** Run `npm run deployment-check` to verify everything is configured correctly!
