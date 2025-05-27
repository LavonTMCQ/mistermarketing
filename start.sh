#!/bin/bash

echo "🚀 Starting Stickerize Bot..."
echo "============================="

# Register Discord commands
echo "📝 Registering Discord commands..."
node src/register-simple-js.js

# Check if command registration was successful
if [ $? -eq 0 ]; then
    echo "✅ Commands registered successfully!"
else
    echo "❌ Command registration failed!"
    exit 1
fi

# Start the debug bot
echo "🤖 Starting debug bot..."
node src/debug-bot.js
