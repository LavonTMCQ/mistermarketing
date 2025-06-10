// 🔍 Test Koios API Response Format
// Let's see what the actual API response looks like

const axios = require('axios');
require('dotenv').config();

async function testKoiosResponse() {
  const txHash = 'bcef8a9280f049303277d3cdb6edb2310e1b1b32426a90fa8db982d413a38640';
  
  try {
    console.log('🔍 Testing Koios API response format...');
    
    const response = await axios.post(
      'https://api.koios.rest/api/v1/tx_info',
      {
        _tx_hashes: [txHash]
      },
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('📊 Full API Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data && response.data.length > 0) {
      const txData = response.data[0];
      console.log('\n🔍 Transaction outputs structure:');
      if (txData.outputs) {
        txData.outputs.forEach((output, index) => {
          console.log(`Output ${index + 1}:`, JSON.stringify(output, null, 2));
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Response:', error.response?.data);
  }
}

testKoiosResponse();
