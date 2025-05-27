// Simple deployment verification script
const fs = require('fs');

console.log('🚀 Stickerize Bot Deployment Check');
console.log('==================================');

// Check environment variables
const requiredEnvVars = ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID', 'REPLICATE_API_TOKEN'];
let envCheck = true;

console.log('\n📋 Environment Variables:');
requiredEnvVars.forEach(envVar => {
  const value = process.env[envVar];
  if (value) {
    console.log(`✅ ${envVar}: Set (length: ${value.length})`);
  } else {
    console.log(`❌ ${envVar}: Not set`);
    envCheck = false;
  }
});

// Check Node.js version
console.log('\n🔧 System Information:');
console.log(`✅ Node.js version: ${process.version}`);
console.log(`✅ Platform: ${process.platform}`);
console.log(`✅ Architecture: ${process.arch}`);

// Check if required files exist
console.log('\n📁 Required Files:');
const requiredFiles = [
  'src/logging-bot.js',
  'src/register-simple-command.ts',
  'package.json'
];

let fileCheck = true;
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}: Found`);
  } else {
    console.log(`❌ ${file}: Missing`);
    fileCheck = false;
  }
});

// Check dependencies
console.log('\n📦 Dependencies:');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const requiredDeps = ['discord.js', 'dotenv', 'axios'];
  
  requiredDeps.forEach(dep => {
    if (packageJson.dependencies && packageJson.dependencies[dep]) {
      console.log(`✅ ${dep}: ${packageJson.dependencies[dep]}`);
    } else {
      console.log(`❌ ${dep}: Missing`);
      fileCheck = false;
    }
  });
} catch (error) {
  console.log('❌ Could not read package.json');
  fileCheck = false;
}

// Final status
console.log('\n🎯 Deployment Status:');
if (envCheck && fileCheck) {
  console.log('✅ Ready for deployment!');
  console.log('\nNext steps:');
  console.log('1. Push your code to GitHub');
  console.log('2. Connect your repository to Railway');
  console.log('3. Set environment variables in Railway dashboard');
  console.log('4. Deploy and monitor logs');
  process.exit(0);
} else {
  console.log('❌ Deployment not ready. Please fix the issues above.');
  process.exit(1);
}
