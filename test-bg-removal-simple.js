// 🧪 Simple Background Removal Test
// This script tests the background removal with a real image

const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function testBackgroundRemoval() {
  console.log('🧪 Testing Background Removal');
  console.log('============================');

  // Check if API token exists
  if (!process.env.REPLICATE_API_TOKEN) {
    console.log('❌ REPLICATE_API_TOKEN not found in environment');
    return;
  }

  console.log('✅ API token found');

  // Create a simple test image (1x1 pixel PNG)
  const testImagePath = path.join(__dirname, 'test-image.png');
  const simpleImageData = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64');
  fs.writeFileSync(testImagePath, simpleImageData);

  try {
    // Test with the most reliable model
    const imageBuffer = fs.readFileSync(testImagePath);
    const base64Image = imageBuffer.toString('base64');
    const dataUri = `data:image/png;base64,${base64Image}`;

    console.log('🔍 Testing cjwbw/rembg model...');

    const response = await axios.post(
      'https://api.replicate.com/v1/predictions',
      {
        version: 'fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003',
        input: {
          image: dataUri
        }
      },
      {
        headers: {
          'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Background removal API call successful!');
    console.log('📋 Prediction ID:', response.data.id);
    console.log('📊 Status:', response.data.status);

    // Poll for a few attempts to see if it works
    let attempts = 0;
    while (attempts < 5) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      
      const pollResponse = await axios.get(
        `https://api.replicate.com/v1/predictions/${response.data.id}`,
        {
          headers: {
            'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`📊 Attempt ${attempts + 1}: ${pollResponse.data.status}`);

      if (pollResponse.data.status === 'succeeded') {
        console.log('🎉 Background removal completed successfully!');
        console.log('🔗 Output URL:', pollResponse.data.output);
        break;
      } else if (pollResponse.data.status === 'failed') {
        console.log('❌ Background removal failed:', pollResponse.data.error);
        break;
      }

      attempts++;
    }

    // Clean up
    fs.unlinkSync(testImagePath);
    console.log('✅ Background removal test completed');

  } catch (error) {
    console.log('❌ Background removal test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('🔑 Authentication issue - check your REPLICATE_API_TOKEN');
    }
  }
}

// Run the test
testBackgroundRemoval();
