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
