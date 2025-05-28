#!/bin/bash

# 🔨 Build Script for Discord Payment Smart Contracts
# This script compiles our Aiken smart contracts and prepares them for deployment

set -e  # Exit on any error

echo "🚀 Building Discord Payment Smart Contracts..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Aiken is installed
if ! command -v aiken &> /dev/null; then
    echo -e "${RED}❌ Aiken is not installed!${NC}"
    echo "Please install Aiken first:"
    echo "curl -sSfL https://install.aiken-lang.org | bash"
    exit 1
fi

echo -e "${BLUE}📋 Aiken version:${NC}"
aiken --version

# Clean previous builds
echo -e "${YELLOW}🧹 Cleaning previous builds...${NC}"
rm -rf plutus.json
rm -rf artifacts/

# Check Aiken project
echo -e "${BLUE}🔍 Checking Aiken project...${NC}"
aiken check

# Run tests
echo -e "${BLUE}🧪 Running tests...${NC}"
aiken test

# Build the contracts
echo -e "${BLUE}🔨 Building contracts...${NC}"
aiken build

# Check if build was successful
if [ -f "plutus.json" ]; then
    echo -e "${GREEN}✅ Build successful!${NC}"
    echo -e "${BLUE}📄 Generated files:${NC}"
    ls -la plutus.json
    
    # Show contract information
    echo -e "${BLUE}📊 Contract information:${NC}"
    cat plutus.json | jq '.validators[] | {title: .title, hash: .hash}'
    
    # Create deployment directory
    mkdir -p deployment
    cp plutus.json deployment/
    
    echo -e "${GREEN}🎉 Smart contracts ready for deployment!${NC}"
    echo -e "${BLUE}📁 Deployment files copied to: deployment/${NC}"
    
else
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi

# Generate deployment instructions
echo -e "${BLUE}📝 Generating deployment instructions...${NC}"
cat > deployment/README.md << EOF
# Discord Payment Smart Contract Deployment

## Files
- \`plutus.json\` - Compiled smart contract
- \`deploy-testnet.sh\` - Testnet deployment script
- \`deploy-mainnet.sh\` - Mainnet deployment script

## Deployment Steps

### 1. Testnet Deployment
\`\`\`bash
cd deployment
./deploy-testnet.sh
\`\`\`

### 2. Test on Testnet
- Send test ADA to contract address
- Verify payments work correctly
- Test all subscription tiers

### 3. Mainnet Deployment
\`\`\`bash
cd deployment
./deploy-mainnet.sh
\`\`\`

## Contract Information
$(cat plutus.json | jq '.validators[] | {title: .title, hash: .hash}')

## Next Steps
1. Deploy to Cardano testnet
2. Integrate with Discord bot
3. Test payment flow end-to-end
4. Deploy to mainnet
5. Launch ADA payments! 🚀
EOF

echo -e "${GREEN}✅ Deployment instructions created!${NC}"
echo -e "${BLUE}📖 See deployment/README.md for next steps${NC}"

# Create testnet deployment script
cat > deployment/deploy-testnet.sh << 'EOF'
#!/bin/bash

# 🧪 Deploy to Cardano Testnet

echo "🧪 Deploying Discord Payment Contract to Testnet..."

# Check if cardano-cli is installed
if ! command -v cardano-cli &> /dev/null; then
    echo "❌ cardano-cli is not installed!"
    echo "Please install Cardano CLI first"
    exit 1
fi

# Set testnet parameters
NETWORK="--testnet-magic 1"
SCRIPT_FILE="plutus.json"

# Extract contract hash
CONTRACT_HASH=$(cat $SCRIPT_FILE | jq -r '.validators[0].hash')
echo "📋 Contract Hash: $CONTRACT_HASH"

# Generate script address
cardano-cli address build \
    --payment-script-file $SCRIPT_FILE \
    $NETWORK \
    --out-file contract-address.addr

CONTRACT_ADDRESS=$(cat contract-address.addr)
echo "🏠 Contract Address: $CONTRACT_ADDRESS"

# Save deployment info
cat > deployment-info.json << EOL
{
  "network": "testnet",
  "contract_hash": "$CONTRACT_HASH",
  "contract_address": "$CONTRACT_ADDRESS",
  "deployed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOL

echo "✅ Testnet deployment complete!"
echo "📄 Contract address saved to: contract-address.addr"
echo "📊 Deployment info saved to: deployment-info.json"
echo ""
echo "🔗 Next steps:"
echo "1. Fund the contract address with test ADA"
echo "2. Update Discord bot with contract address"
echo "3. Test payment flow"
EOF

# Create mainnet deployment script
cat > deployment/deploy-mainnet.sh << 'EOF'
#!/bin/bash

# 🚀 Deploy to Cardano Mainnet

echo "🚀 Deploying Discord Payment Contract to Mainnet..."
echo "⚠️  WARNING: This will deploy to MAINNET with real ADA!"
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Deployment cancelled"
    exit 1
fi

# Check if cardano-cli is installed
if ! command -v cardano-cli &> /dev/null; then
    echo "❌ cardano-cli is not installed!"
    exit 1
fi

# Set mainnet parameters
NETWORK="--mainnet"
SCRIPT_FILE="plutus.json"

# Extract contract hash
CONTRACT_HASH=$(cat $SCRIPT_FILE | jq -r '.validators[0].hash')
echo "📋 Contract Hash: $CONTRACT_HASH"

# Generate script address
cardano-cli address build \
    --payment-script-file $SCRIPT_FILE \
    $NETWORK \
    --out-file contract-address-mainnet.addr

CONTRACT_ADDRESS=$(cat contract-address-mainnet.addr)
echo "🏠 Contract Address: $CONTRACT_ADDRESS"

# Save deployment info
cat > deployment-info-mainnet.json << EOL
{
  "network": "mainnet",
  "contract_hash": "$CONTRACT_HASH",
  "contract_address": "$CONTRACT_ADDRESS",
  "deployed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOL

echo "✅ Mainnet deployment complete!"
echo "📄 Contract address saved to: contract-address-mainnet.addr"
echo "📊 Deployment info saved to: deployment-info-mainnet.json"
echo ""
echo "🎉 Your Discord bot can now accept ADA payments!"
echo "💰 Contract Address: $CONTRACT_ADDRESS"
EOF

# Make scripts executable
chmod +x deployment/deploy-testnet.sh
chmod +x deployment/deploy-mainnet.sh

echo -e "${GREEN}🎉 Build complete! Smart contracts ready for deployment.${NC}"
echo -e "${BLUE}📁 Check the deployment/ folder for next steps.${NC}"
