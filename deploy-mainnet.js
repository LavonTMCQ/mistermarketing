// 🚀 Mainnet Deployment Script
// This script helps you deploy to Cardano mainnet with your wallet address

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Stickerize Bot - Mainnet Deployment');
console.log('=====================================');

// Check if wallet address is configured
const envPath = '.env';
let walletAddress = null;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/PAYMENT_WALLET_ADDRESS=(.+)/);
  if (match) {
    walletAddress = match[1].trim();
  }
}

if (!walletAddress || walletAddress.includes('placeholder') || walletAddress.includes('test')) {
  console.log('❌ WALLET ADDRESS NOT CONFIGURED');
  console.log('');
  console.log('Please set your mainnet wallet address first:');
  console.log('');
  console.log('1. Get your Cardano wallet address (starts with addr1...)');
  console.log('2. Add to .env file: PAYMENT_WALLET_ADDRESS=addr1your_address_here');
  console.log('3. Run this script again');
  console.log('');
  console.log('📖 See WALLET_SETUP_GUIDE.md for detailed instructions');
  process.exit(1);
}

console.log('✅ Wallet address configured:', walletAddress);

// Validate mainnet address format
if (!walletAddress.startsWith('addr1')) {
  console.log('⚠️  WARNING: Address does not look like a mainnet address');
  console.log('   Mainnet addresses start with "addr1"');
  console.log('   Testnet addresses start with "addr_test1"');
  console.log('');
  console.log('Are you sure you want to continue? (y/N)');
  
  // Simple prompt simulation
  console.log('Please update your address and run again if needed.');
  process.exit(1);
}

console.log('');
console.log('🎯 DEPLOYMENT CHECKLIST');
console.log('=======================');

const checklist = [
  '✅ Wallet address configured',
  '⏳ Smart contract deployment',
  '⏳ Environment variables updated',
  '⏳ Bot restart',
  '⏳ Payment testing'
];

checklist.forEach(item => console.log(item));

console.log('');
console.log('🔧 DEPLOYING SMART CONTRACT TO MAINNET...');

try {
  // Deploy smart contract to mainnet
  console.log('📋 Building smart contract...');
  execSync('cd cardano-contracts && export PATH="$HOME/.aiken/bin:$PATH" && aiken build', { stdio: 'inherit' });
  
  console.log('🚀 Deploying to mainnet...');
  execSync('cd cardano-contracts/deployment && ./deploy-mainnet.sh', { stdio: 'inherit' });
  
  console.log('✅ Smart contract deployed successfully!');
  
} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  process.exit(1);
}

console.log('');
console.log('🔄 UPDATING ENVIRONMENT VARIABLES...');

// Update environment variables
let envContent = fs.readFileSync(envPath, 'utf8');

// Add or update network setting
if (envContent.includes('CARDANO_NETWORK=')) {
  envContent = envContent.replace(/CARDANO_NETWORK=.*/g, 'CARDANO_NETWORK=mainnet');
} else {
  envContent += '\nCARDANO_NETWORK=mainnet\n';
}

fs.writeFileSync(envPath, envContent);
console.log('✅ Environment variables updated');

console.log('');
console.log('🎉 MAINNET DEPLOYMENT COMPLETE!');
console.log('===============================');

console.log('');
console.log('💰 YOUR PAYMENT SYSTEM IS NOW LIVE!');
console.log('');
console.log('📊 Revenue Potential:');
console.log('   • Premium (15 ADA/month): Unlimited potential');
console.log('   • Ultra (25 ADA/month): Premium features');
console.log('   • Server (100 ADA/month): Server-wide access');
console.log('');
console.log('🎯 Next Steps:');
console.log('   1. Restart your Discord bot');
console.log('   2. Test with a small payment');
console.log('   3. Announce to your community');
console.log('   4. Start earning ADA! 🪙');
console.log('');
console.log('📖 Monitor payments in your wallet:');
console.log(`   Address: ${walletAddress}`);
console.log('');
console.log('🚀 You now have the world\'s first Discord bot accepting ADA payments!');

// Create a summary file
const summary = {
  deploymentDate: new Date().toISOString(),
  network: 'mainnet',
  walletAddress: walletAddress,
  status: 'deployed',
  features: [
    'ADA payments to your wallet',
    'Automatic payment verification',
    'Tier-based subscriptions',
    'Real-time service activation'
  ],
  revenue: {
    premium: '15 ADA/month',
    ultra: '25 ADA/month',
    server: '100 ADA/month'
  }
};

fs.writeFileSync('mainnet-deployment-summary.json', JSON.stringify(summary, null, 2));
console.log('📄 Deployment summary saved to: mainnet-deployment-summary.json');
