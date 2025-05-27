# Use Node.js 18 LTS
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install ffmpeg for video processing
RUN apk add --no-cache ffmpeg

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Expose port for health check
EXPOSE 3000

# Start the bot
CMD ["sh", "-c", "node src/register-simple-js.js; npm run logging-bot"]
