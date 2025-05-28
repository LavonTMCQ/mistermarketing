# 🤖 Discord Bot + Cardano Integration Guide

## 🎯 **Goal: Connect Smart Contracts to Discord Bot**

This guide shows how to integrate our Aiken smart contracts with the Discord bot for automatic payment processing.

---

## 🏗️ **Architecture Overview**

```
Discord User → Discord Bot → Payment Address → Smart Contract → Blockchain Monitor → Discord Role Grant
```

### **Components:**
1. **Discord Bot** - Handles user commands and role management
2. **Payment Generator** - Creates unique payment addresses
3. **Blockchain Monitor** - Watches for payments to our addresses
4. **Smart Contract** - Validates payments on Cardano
5. **Access Manager** - Grants Discord roles after payment

---

## 📦 **Required Node.js Libraries**

### **Installation**
```bash
npm install @emurgo/cardano-serialization-lib-nodejs
npm install @blockfrost/blockfrost-js
npm install discord.js
npm install dotenv
npm install axios
```

### **Library Purposes:**
- **cardano-serialization-lib** - Build and sign Cardano transactions
- **blockfrost** - Query Cardano blockchain data
- **discord.js** - Discord bot functionality
- **dotenv** - Environment variable management
- **axios** - HTTP requests

---

## 🔧 **Environment Setup**

### **.env Configuration**
```env
# Discord Bot
DISCORD_TOKEN=your_discord_bot_token
GUILD_ID=your_discord_server_id

# Cardano Network
CARDANO_NETWORK=testnet  # or mainnet
BLOCKFROST_PROJECT_ID=your_blockfrost_project_id

# Smart Contract
SCRIPT_ADDRESS=addr_test1w...  # Your deployed contract address
SCRIPT_CBOR=590a4d590a4a...    # Compiled contract CBOR

# Payment Processing
PAYMENT_WALLET_MNEMONIC=your_wallet_mnemonic_phrase
PAYMENT_DERIVATION_PATH=m/1852'/1815'/0'/0/0

# Subscription Pricing (in lovelace)
PREMIUM_PRICE=5000000   # 5 ADA
ULTRA_PRICE=10000000    # 10 ADA
SERVER_PRICE=50000000   # 50 ADA
```

---

## 💰 **Payment Address Generation**

### **Generate Unique Payment Addresses**
```javascript
const CardanoWasm = require('@emurgo/cardano-serialization-lib-nodejs');

class PaymentAddressGenerator {
  constructor(scriptAddress, networkId = 0) {
    this.scriptAddress = scriptAddress;
    this.networkId = networkId; // 0 = testnet, 1 = mainnet
  }

  // Generate unique payment address for user and subscription
  generatePaymentAddress(discordUserId, subscriptionTier, durationMonths) {
    // Create unique identifier
    const paymentId = this.createPaymentId(discordUserId, subscriptionTier, durationMonths);
    
    // Generate address with payment ID
    const address = CardanoWasm.Address.from_bech32(this.scriptAddress);
    const baseAddress = CardanoWasm.BaseAddress.from_address(address);
    
    // Add payment ID to address (this is simplified - real implementation would be more complex)
    return {
      address: this.scriptAddress, // In real implementation, this would be unique per payment
      paymentId: paymentId,
      expectedAmount: this.getTierPrice(subscriptionTier),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    };
  }

  createPaymentId(discordUserId, tier, months) {
    const timestamp = Date.now();
    return `${discordUserId}_${tier}_${months}_${timestamp}`;
  }

  getTierPrice(tier) {
    const prices = {
      'Premium': 5000000,   // 5 ADA
      'Ultra': 10000000,    // 10 ADA
      'Server': 50000000    // 50 ADA
    };
    return prices[tier] || 0;
  }
}

// Usage
const paymentGenerator = new PaymentAddressGenerator(process.env.SCRIPT_ADDRESS);
const paymentRequest = paymentGenerator.generatePaymentAddress(
  '1234567890123456789', // Discord user ID
  'Premium',             // Subscription tier
  1                      // Duration in months
);
```

---

## 🔍 **Blockchain Monitoring**

### **Monitor for Payments**
```javascript
const Blockfrost = require('@blockfrost/blockfrost-js');

class PaymentMonitor {
  constructor(blockfrostProjectId, scriptAddress) {
    this.blockfrost = new Blockfrost.BlockFrostApi({
      projectId: blockfrostProjectId,
      network: process.env.CARDANO_NETWORK
    });
    this.scriptAddress = scriptAddress;
    this.processedTxs = new Set(); // Prevent duplicate processing
  }

  // Monitor for new payments to our script address
  async monitorPayments() {
    try {
      console.log('Monitoring for payments...');
      
      // Get all UTXOs at our script address
      const utxos = await this.blockfrost.addressesUtxos(this.scriptAddress);
      
      for (const utxo of utxos) {
        const txHash = utxo.tx_hash;
        
        // Skip if already processed
        if (this.processedTxs.has(txHash)) continue;
        
        // Get transaction details
        const txDetails = await this.blockfrost.txs(txHash);
        const txMetadata = await this.blockfrost.txsMetadata(txHash);
        
        // Process the payment
        await this.processPayment(utxo, txDetails, txMetadata);
        
        // Mark as processed
        this.processedTxs.add(txHash);
      }
    } catch (error) {
      console.error('Error monitoring payments:', error);
    }
  }

  // Process individual payment
  async processPayment(utxo, txDetails, txMetadata) {
    try {
      // Extract payment amount
      const paymentAmount = parseInt(utxo.amount.find(a => a.unit === 'lovelace')?.quantity || '0');
      
      // Extract Discord user ID from metadata
      const discordUserId = this.extractDiscordUserId(txMetadata);
      
      if (!discordUserId) {
        console.log('No Discord user ID found in transaction metadata');
        return;
      }

      // Determine subscription tier based on payment amount
      const subscriptionTier = this.determineSubscriptionTier(paymentAmount);
      
      if (!subscriptionTier) {
        console.log(`Invalid payment amount: ${paymentAmount} lovelace`);
        return;
      }

      // Grant Discord access
      await this.grantDiscordAccess(discordUserId, subscriptionTier, paymentAmount);
      
      console.log(`✅ Processed payment: ${discordUserId} → ${subscriptionTier} (${paymentAmount} lovelace)`);
      
    } catch (error) {
      console.error('Error processing payment:', error);
    }
  }

  // Extract Discord user ID from transaction metadata
  extractDiscordUserId(txMetadata) {
    try {
      // Look for our metadata label (674 is commonly used)
      const ourMetadata = txMetadata.find(m => m.label === '674');
      if (!ourMetadata) return null;

      const metadata = JSON.parse(ourMetadata.json_metadata);
      return metadata.discord_user_id;
    } catch (error) {
      console.error('Error extracting Discord user ID:', error);
      return null;
    }
  }

  // Determine subscription tier based on payment amount
  determineSubscriptionTier(paymentAmount) {
    if (paymentAmount >= 50000000) return 'Server';   // 50+ ADA
    if (paymentAmount >= 10000000) return 'Ultra';    // 10+ ADA
    if (paymentAmount >= 5000000) return 'Premium';   // 5+ ADA
    return null; // Invalid amount
  }

  // Grant Discord access based on subscription
  async grantDiscordAccess(discordUserId, subscriptionTier, paymentAmount) {
    // This will be implemented in the Discord integration section
    console.log(`Granting ${subscriptionTier} access to user ${discordUserId}`);
  }

  // Start monitoring (call this periodically)
  startMonitoring(intervalMs = 30000) { // Check every 30 seconds
    setInterval(() => {
      this.monitorPayments();
    }, intervalMs);
  }
}

// Usage
const monitor = new PaymentMonitor(
  process.env.BLOCKFROST_PROJECT_ID,
  process.env.SCRIPT_ADDRESS
);
monitor.startMonitoring();
```

---

## 🤖 **Discord Bot Integration**

### **Payment Command Handler**
```javascript
const { SlashCommandBuilder } = require('discord.js');

// Add payment command to existing bot
const paymentCommand = new SlashCommandBuilder()
  .setName('subscribe')
  .setDescription('Subscribe to premium features with ADA')
  .addStringOption(option =>
    option.setName('tier')
      .setDescription('Subscription tier')
      .setRequired(true)
      .addChoices(
        { name: '💎 Premium (5 ADA/month)', value: 'Premium' },
        { name: '🔥 Ultra (10 ADA/month)', value: 'Ultra' },
        { name: '🚀 Server (50 ADA/month)', value: 'Server' }
      ))
  .addIntegerOption(option =>
    option.setName('months')
      .setDescription('Subscription duration in months')
      .setRequired(false)
      .setMinValue(1)
      .setMaxValue(12));

// Handle payment command
async function handleSubscribeCommand(interaction) {
  try {
    await interaction.deferReply({ ephemeral: true });

    const tier = interaction.options.getString('tier');
    const months = interaction.options.getInteger('months') || 1;
    const userId = interaction.user.id;

    // Generate payment address
    const paymentRequest = paymentGenerator.generatePaymentAddress(userId, tier, months);
    
    // Calculate total cost
    const totalCost = paymentRequest.expectedAmount * months;
    const totalADA = totalCost / 1000000;

    // Create payment embed
    const paymentEmbed = {
      color: 0x9b59b6,
      title: `💰 ${tier} Subscription Payment`,
      description: `Pay with ADA to activate your ${tier} subscription!`,
      fields: [
        {
          name: '💎 Subscription Details',
          value: `**Tier:** ${tier}\n**Duration:** ${months} month(s)\n**Total Cost:** ${totalADA} ADA`,
          inline: false
        },
        {
          name: '🏦 Payment Address',
          value: `\`\`\`${paymentRequest.address}\`\`\``,
          inline: false
        },
        {
          name: '📋 Payment Instructions',
          value: '1. Copy the payment address above\n2. Send exactly **' + totalADA + ' ADA** to this address\n3. Include your Discord ID in transaction metadata\n4. Wait for confirmation (usually 1-2 minutes)',
          inline: false
        },
        {
          name: '⚠️ Important Notes',
          value: '• Payment expires in 24 hours\n• Send exact amount only\n• Include Discord ID in metadata\n• Testnet ADA only (for now)',
          inline: false
        }
      ],
      footer: {
        text: 'Stickerize Bot - Revolutionary ADA payments! 🪙'
      },
      timestamp: new Date().toISOString()
    };

    await interaction.followUp({
      embeds: [paymentEmbed],
      ephemeral: true
    });

    // Store payment request for tracking
    await storePaymentRequest(userId, paymentRequest, tier, months);

  } catch (error) {
    console.error('Error handling subscribe command:', error);
    await interaction.followUp({
      content: 'An error occurred while processing your subscription request.',
      ephemeral: true
    });
  }
}
```

---

## 🔐 **Access Management**

### **Grant Discord Roles After Payment**
```javascript
class DiscordAccessManager {
  constructor(client) {
    this.client = client;
    this.roleMap = {
      'Premium': process.env.PREMIUM_ROLE_ID,
      'Ultra': process.env.ULTRA_ROLE_ID,
      'Server': process.env.SERVER_ROLE_ID
    };
  }

  // Grant subscription access to Discord user
  async grantSubscriptionAccess(discordUserId, subscriptionTier, paymentAmount) {
    try {
      const guild = this.client.guilds.cache.get(process.env.GUILD_ID);
      if (!guild) {
        console.error('Guild not found');
        return false;
      }

      const member = await guild.members.fetch(discordUserId);
      if (!member) {
        console.error(`Member ${discordUserId} not found`);
        return false;
      }

      // Get role for subscription tier
      const roleId = this.roleMap[subscriptionTier];
      if (!roleId) {
        console.error(`No role configured for tier: ${subscriptionTier}`);
        return false;
      }

      const role = guild.roles.cache.get(roleId);
      if (!role) {
        console.error(`Role ${roleId} not found`);
        return false;
      }

      // Add role to member
      await member.roles.add(role);

      // Send confirmation message
      await this.sendConfirmationMessage(member, subscriptionTier, paymentAmount);

      // Log the access grant
      console.log(`✅ Granted ${subscriptionTier} access to ${member.user.tag}`);
      
      return true;

    } catch (error) {
      console.error('Error granting Discord access:', error);
      return false;
    }
  }

  // Send confirmation message to user
  async sendConfirmationMessage(member, subscriptionTier, paymentAmount) {
    try {
      const adaAmount = paymentAmount / 1000000;
      
      const confirmationEmbed = {
        color: 0x00ff00,
        title: '🎉 Subscription Activated!',
        description: `Your ${subscriptionTier} subscription has been activated!`,
        fields: [
          {
            name: '💰 Payment Confirmed',
            value: `${adaAmount} ADA received and verified`,
            inline: true
          },
          {
            name: '🎭 Features Unlocked',
            value: this.getTierFeatures(subscriptionTier),
            inline: false
          },
          {
            name: '🚀 Get Started',
            value: 'Use `/stickerize quality:premium` to try premium features!',
            inline: false
          }
        ],
        footer: {
          text: 'Thank you for supporting Stickerize Bot! 🙏'
        },
        timestamp: new Date().toISOString()
      };

      await member.send({ embeds: [confirmationEmbed] });
    } catch (error) {
      console.error('Error sending confirmation message:', error);
    }
  }

  // Get feature list for subscription tier
  getTierFeatures(tier) {
    const features = {
      'Premium': '• 50 animations per hour\n• Background removal\n• All animation styles\n• Priority support',
      'Ultra': '• 200 animations per hour\n• Premium AI models\n• Background removal\n• All animation styles\n• Priority processing\n• Beta features',
      'Server': '• 1000 animations per hour\n• Server-wide access\n• Premium AI models\n• All features included\n• Dedicated support'
    };
    return features[tier] || 'Standard features';
  }

  // Remove access when subscription expires
  async revokeSubscriptionAccess(discordUserId, subscriptionTier) {
    try {
      const guild = this.client.guilds.cache.get(process.env.GUILD_ID);
      const member = await guild.members.fetch(discordUserId);
      const roleId = this.roleMap[subscriptionTier];
      const role = guild.roles.cache.get(roleId);

      if (member && role) {
        await member.roles.remove(role);
        console.log(`❌ Revoked ${subscriptionTier} access from ${member.user.tag}`);
      }
    } catch (error) {
      console.error('Error revoking Discord access:', error);
    }
  }
}

// Usage
const accessManager = new DiscordAccessManager(client);

// In payment monitor
async function grantDiscordAccess(discordUserId, subscriptionTier, paymentAmount) {
  await accessManager.grantSubscriptionAccess(discordUserId, subscriptionTier, paymentAmount);
}
```

---

## 🔄 **Complete Integration Flow**

### **Main Integration Class**
```javascript
class CardanoDiscordIntegration {
  constructor(client) {
    this.client = client;
    this.paymentGenerator = new PaymentAddressGenerator(process.env.SCRIPT_ADDRESS);
    this.paymentMonitor = new PaymentMonitor(
      process.env.BLOCKFROST_PROJECT_ID,
      process.env.SCRIPT_ADDRESS
    );
    this.accessManager = new DiscordAccessManager(client);
    
    // Connect payment monitor to access manager
    this.paymentMonitor.grantDiscordAccess = this.accessManager.grantSubscriptionAccess.bind(this.accessManager);
  }

  // Initialize the integration
  async initialize() {
    console.log('🚀 Initializing Cardano-Discord integration...');
    
    // Start monitoring for payments
    this.paymentMonitor.startMonitoring();
    
    // Register payment commands
    await this.registerPaymentCommands();
    
    console.log('✅ Cardano-Discord integration ready!');
  }

  // Register Discord slash commands
  async registerPaymentCommands() {
    // Add subscribe command to existing commands
    const commands = [
      // ... existing commands (stickerize, stickerstats)
      paymentCommand.toJSON()
    ];

    // Register commands with Discord
    const rest = new REST().setToken(process.env.DISCORD_TOKEN);
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
  }
}

// Initialize in main bot file
const integration = new CardanoDiscordIntegration(client);
client.once('ready', async () => {
  await integration.initialize();
});
```

---

## 🧪 **Testing the Integration**

### **Test Payment Flow**
```javascript
// Test with Cardano testnet
async function testPaymentFlow() {
  const testUserId = '1234567890123456789';
  const testTier = 'Premium';
  const testMonths = 1;

  // 1. Generate payment address
  const paymentRequest = paymentGenerator.generatePaymentAddress(testUserId, testTier, testMonths);
  console.log('Payment address:', paymentRequest.address);

  // 2. Simulate payment (you would actually send ADA here)
  console.log('Send 5 ADA to the address above with metadata:');
  console.log(JSON.stringify({ discord_user_id: testUserId }));

  // 3. Monitor will detect payment and grant access automatically
}
```

---

## 🚀 **Next Steps**

After implementing off-chain integration:
1. **Test on Cardano testnet** - Use testnet ADA for safe testing
2. **Deploy smart contracts** - Follow deployment guide
3. **Security audit** - Review security checklist
4. **Mainnet deployment** - Launch with real ADA

---

**🎉 You now have a complete Discord bot + Cardano integration system!**
