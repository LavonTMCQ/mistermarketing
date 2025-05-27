#!/bin/bash

# Stickerize Bot - Railway Deployment Script
echo "🚀 Stickerize Bot - Railway Deployment"
echo "======================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Error: Git repository not found. Please initialize git first."
    echo "Run: git init && git add . && git commit -m 'Initial commit'"
    exit 1
fi

# Run deployment check
echo "🔍 Running deployment check..."
npm run deployment-check
if [ $? -ne 0 ]; then
    echo "❌ Deployment check failed. Please fix the issues above."
    exit 1
fi

echo "✅ Deployment check passed!"

# Check if there are uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "📝 Uncommitted changes detected. Committing..."
    git add .
    git commit -m "Prepare for Railway deployment - $(date)"
else
    echo "✅ No uncommitted changes."
fi

# Push to remote
echo "📤 Pushing to remote repository..."
git push origin main
if [ $? -ne 0 ]; then
    echo "❌ Failed to push to remote. Please check your git configuration."
    exit 1
fi

echo "✅ Code pushed successfully!"

# Display next steps
echo ""
echo "🎯 Next Steps:"
echo "1. Go to https://railway.app/dashboard"
echo "2. Click 'New Project' → 'Deploy from GitHub repo'"
echo "3. Select your repository"
echo "4. Set these environment variables in Railway:"
echo "   - DISCORD_TOKEN=your_discord_bot_token"
echo "   - DISCORD_CLIENT_ID=your_discord_client_id"
echo "   - REPLICATE_API_TOKEN=your_replicate_api_token"
echo "5. Deploy and monitor the logs"
echo ""
echo "🔗 Useful Links:"
echo "- Railway Dashboard: https://railway.app/dashboard"
echo "- Discord Developer Portal: https://discord.com/developers/applications"
echo "- Replicate API: https://replicate.com/account/api-tokens"
echo ""
echo "✨ Your bot will be live in 2-3 minutes after deployment!"
