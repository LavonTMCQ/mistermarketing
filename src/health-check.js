// Simple health check server for Railway
const http = require('http');
const fs = require('fs');

const PORT = process.env.PORT || 3000;

// Create a simple HTTP server for health checks
const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    // Check if bot is running by looking for recent log entries
    let status = 'unknown';
    let lastActivity = 'unknown';
    
    try {
      if (fs.existsSync('bot-log.txt')) {
        const logContent = fs.readFileSync('bot-log.txt', 'utf8');
        const lines = logContent.split('\n').filter(line => line.trim());
        
        if (lines.length > 0) {
          const lastLine = lines[lines.length - 1];
          lastActivity = lastLine;
          
          // Check if bot logged in recently
          if (logContent.includes('Ready! Logged in as')) {
            status = 'healthy';
          } else if (logContent.includes('Error') || logContent.includes('Failed')) {
            status = 'error';
          } else {
            status = 'starting';
          }
        }
      }
    } catch (error) {
      status = 'error';
      lastActivity = `Health check error: ${error.message}`;
    }
    
    const healthData = {
      status: status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      lastActivity: lastActivity,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        discordTokenSet: !!process.env.DISCORD_TOKEN,
        replicateTokenSet: !!process.env.REPLICATE_API_TOKEN
      }
    };
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(healthData, null, 2));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`Health check server running on port ${PORT}`);
  fs.appendFileSync('bot-log.txt', `Health check server started on port ${PORT}\n`);
});

module.exports = server;
