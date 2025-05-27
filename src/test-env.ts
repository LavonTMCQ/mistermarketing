import { config } from 'dotenv';

// Load environment variables
config();

console.log('Environment Variables Test');
console.log('-------------------------');
console.log('DISCORD_TOKEN:', process.env.DISCORD_TOKEN ? 'Set (length: ' + process.env.DISCORD_TOKEN.length + ')' : 'Not set');
console.log('DISCORD_CLIENT_ID:', process.env.DISCORD_CLIENT_ID ? process.env.DISCORD_CLIENT_ID : 'Not set');
console.log('DISCORD_GUILD_ID:', process.env.DISCORD_GUILD_ID ? process.env.DISCORD_GUILD_ID : 'Not set');
console.log('REPLICATE_API_TOKEN:', process.env.REPLICATE_API_TOKEN ? 'Set (length: ' + process.env.REPLICATE_API_TOKEN.length + ')' : 'Not set');
console.log('-------------------------');
