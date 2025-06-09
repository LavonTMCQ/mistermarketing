#!/bin/bash

# 🧪 Deploy to Cardano Testnet

echo "🧪 Deploying Discord Payment Contract to Testnet..."

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

# Set testnet parameters
NETWORK="--testnet-magic 1"
SCRIPT_FILE="payment-script.json"
PLUTUS_FILE="plutus.json"

# Extract contract hash from plutus.json
CONTRACT_HASH=$(cat $PLUTUS_FILE | jq -r '.validators[0].hash')
echo "📋 Contract Hash: $CONTRACT_HASH"

# Generate script address
$CARDANO_CLI_CMD address build \
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
