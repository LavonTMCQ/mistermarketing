# Discord Payment Smart Contract Deployment

## Files
- `plutus.json` - Compiled smart contract
- `deploy-testnet.sh` - Testnet deployment script
- `deploy-mainnet.sh` - Mainnet deployment script

## Deployment Steps

### 1. Testnet Deployment
```bash
cd deployment
./deploy-testnet.sh
```

### 2. Test on Testnet
- Send test ADA to contract address
- Verify payments work correctly
- Test all subscription tiers

### 3. Mainnet Deployment
```bash
cd deployment
./deploy-mainnet.sh
```

## Contract Information
{
  "title": "payment_validator.simple_payment_validator.spend",
  "hash": "586bd4ff0bb18c8b8a264302ca68eb680108e8b266226556fe379e70"
}
{
  "title": "payment_validator.simple_payment_validator.else",
  "hash": "586bd4ff0bb18c8b8a264302ca68eb680108e8b266226556fe379e70"
}

## Next Steps
1. Deploy to Cardano testnet
2. Integrate with Discord bot
3. Test payment flow end-to-end
4. Deploy to mainnet
5. Launch ADA payments! 🚀
