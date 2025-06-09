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
