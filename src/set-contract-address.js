// 🔧 Set Contract Address for Payment System
// Run this script after deploying smart contracts to set the payment address

const { paymentVerifier } = require('./commands/payment-commands');
const fs = require('fs');
const path = require('path');

// Contract addresses (will be updated after deployment)
const CONTRACT_ADDRESSES = {
  testnet: 'addr_test1_placeholder', // Will be updated after testnet deployment
  mainnet: 'addr1_placeholder'       // Will be updated after mainnet deployment
};

// Set the contract address based on environment
function setContractAddress(network = 'testnet') {
  const address = CONTRACT_ADDRESSES[network];
  
  if (!address || address.includes('placeholder')) {
    console.log(`❌ Contract address not set for ${network}`);
    console.log('Please update CONTRACT_ADDRESSES in this file after deployment');
    return false;
  }

  // Set the address in the payment verifier
  paymentVerifier.setContractAddress(address);
  
  // Save to environment file for persistence
  const envPath = path.join(__dirname, '..', '.env');
  let envContent = '';
  
  try {
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
  } catch (error) {
    console.log('Creating new .env file...');
  }

  // Update or add contract address
  const addressKey = `CONTRACT_ADDRESS_${network.toUpperCase()}`;
  const addressLine = `${addressKey}=${address}`;
  
  if (envContent.includes(addressKey)) {
    // Replace existing line
    envContent = envContent.replace(
      new RegExp(`${addressKey}=.*`), 
      addressLine
    );
  } else {
    // Add new line
    envContent += `\n${addressLine}\n`;
  }

  fs.writeFileSync(envPath, envContent);
  
  console.log(`✅ Contract address set for ${network}: ${address}`);
  console.log(`📄 Updated .env file with ${addressKey}`);
  
  return true;
}

// Main function
function main() {
  const network = process.argv[2] || 'testnet';
  
  console.log(`🚀 Setting contract address for ${network}...`);
  
  if (setContractAddress(network)) {
    console.log('✅ Contract address configuration complete!');
    console.log('🔄 Restart the bot to use the new contract address.');
  } else {
    console.log('❌ Failed to set contract address.');
    console.log('Please update the CONTRACT_ADDRESSES object in this file.');
  }
}

// Export for use in other modules
module.exports = {
  setContractAddress,
  CONTRACT_ADDRESSES
};

// Run if called directly
if (require.main === module) {
  main();
}
