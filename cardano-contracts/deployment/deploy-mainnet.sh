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
CARDANO_CLI="$HOME/.local/cardano-cli"
if ! command -v cardano-cli &> /dev/null && [ ! -f "$CARDANO_CLI" ]; then
    echo "❌ cardano-cli is not installed!"
    echo "Please install Cardano CLI first"
    exit 1
fi

# Use local cardano-cli if available
if [ -f "$CARDANO_CLI" ]; then
    CARDANO_CLI_CMD="$CARDANO_CLI"
else
    CARDANO_CLI_CMD="cardano-cli"
fi

echo "✅ Using Cardano CLI: $CARDANO_CLI_CMD"

# Set mainnet parameters
NETWORK="--mainnet"
SCRIPT_FILE="payment-script-mainnet.json"
PLUTUS_FILE="plutus.json"

# Extract contract hash from plutus.json
CONTRACT_HASH=$(cat $PLUTUS_FILE | jq -r '.validators[0].hash')
echo "📋 Contract Hash: $CONTRACT_HASH"

# Generate script address
$CARDANO_CLI_CMD address build \
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
