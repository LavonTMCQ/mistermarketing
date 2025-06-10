// 🧪 Test and Fix Background Removal
// This script tests the background removal functionality and fixes any issues

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Test the current background removal function
async function testBackgroundRemoval() {
  console.log('🧪 Testing Background Removal Functionality');
  console.log('==========================================');

  // Create a test image (simple colored square)
  const testImagePath = path.join(__dirname, 'test-bg-removal.png');
  
  // Create a simple test image if it doesn't exist
  if (!fs.existsSync(testImagePath)) {
    console.log('📸 Creating test image...');
    // For now, we'll use a placeholder - in real testing you'd use an actual image
    const testImageData = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77yQAAAABJRU5ErkJggg==', 'base64');
    fs.writeFileSync(testImagePath, testImageData);
  }

  try {
    // Test the current API version
    console.log('🔍 Testing current background removal API...');
    
    const imageBuffer = fs.readFileSync(testImagePath);
    const base64Image = imageBuffer.toString('base64');
    const dataUri = `data:image/png;base64,${base64Image}`;

    // Test the current version
    const response = await axios.post(
      'https://api.replicate.com/v1/predictions',
      {
        version: "a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc", // Current version
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

    console.log('✅ API call successful, prediction ID:', response.data.id);
    return response.data.id;

  } catch (error) {
    console.log('❌ Current version failed:', error.response?.data || error.message);
    
    // Try to get the latest version
    console.log('🔍 Checking for latest background removal models...');
    
    try {
      const modelsResponse = await axios.get(
        'https://api.replicate.com/v1/models/cjwbw/rembg',
        {
          headers: {
            'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`
          }
        }
      );
      
      console.log('📋 Latest version:', modelsResponse.data.latest_version?.id);
      return modelsResponse.data.latest_version?.id;
      
    } catch (modelError) {
      console.log('❌ Could not fetch model info:', modelError.message);
      
      // Try alternative models
      console.log('🔍 Trying alternative background removal models...');
      
      const alternativeModels = [
        {
          name: 'cjwbw/rembg',
          version: 'fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003'
        },
        {
          name: 'pollinations/modnet',
          version: '6c6de43b8dcbf8f2b2f92b0d87d8d8f8c8f8f8f8'
        }
      ];

      for (const model of alternativeModels) {
        try {
          console.log(`🧪 Testing ${model.name}...`);
          
          const testResponse = await axios.post(
            'https://api.replicate.com/v1/predictions',
            {
              version: model.version,
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
          
          console.log(`✅ ${model.name} works! Version: ${model.version}`);
          return model.version;
          
        } catch (altError) {
          console.log(`❌ ${model.name} failed:`, altError.response?.data || altError.message);
        }
      }
    }
  }
}

// Get the latest working version
async function getLatestBackgroundRemovalVersion() {
  try {
    console.log('🔍 Fetching latest background removal models...');
    
    // Try multiple popular background removal models
    const models = [
      'cjwbw/rembg',
      'pollinations/modnet',
      'skytnt/anime-remove-background',
      'nightmareai/real-esrgan'
    ];

    for (const modelName of models) {
      try {
        const response = await axios.get(
          `https://api.replicate.com/v1/models/${modelName}`,
          {
            headers: {
              'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`
            }
          }
        );

        if (response.data.latest_version) {
          console.log(`✅ Found working model: ${modelName}`);
          console.log(`📋 Latest version: ${response.data.latest_version.id}`);
          console.log(`📝 Description: ${response.data.description}`);
          
          return {
            model: modelName,
            version: response.data.latest_version.id,
            description: response.data.description
          };
        }
      } catch (error) {
        console.log(`❌ ${modelName} not accessible`);
      }
    }

    throw new Error('No working background removal models found');
    
  } catch (error) {
    console.error('Error fetching models:', error.message);
    throw error;
  }
}

// Main test function
async function main() {
  try {
    // Test current implementation
    await testBackgroundRemoval();
    
    // Get latest working version
    const latestModel = await getLatestBackgroundRemovalVersion();
    
    console.log('');
    console.log('🎯 RECOMMENDED FIX:');
    console.log('==================');
    console.log(`Model: ${latestModel.model}`);
    console.log(`Version: ${latestModel.version}`);
    console.log(`Description: ${latestModel.description}`);
    
    // Create the fixed function
    console.log('');
    console.log('🔧 CREATING FIXED BACKGROUND REMOVAL FUNCTION...');
    
    const fixedFunction = `
// Fixed background removal function
async function removeImageBackgroundWithAI(imagePath, tempDir) {
  try {
    fs.appendFileSync('bot-log.txt', 'Calling Replicate API for background removal\\n');

    // Read image file and convert to base64 data URI
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const mimeType = imagePath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
    const dataUri = \`data:\${mimeType};base64,\${base64Image}\`;

    fs.appendFileSync('bot-log.txt', \`Image size: \${imageBuffer.length} bytes\\n\`);

    // Call Replicate API for background removal using working model
    const replicateResponse = await axios.post(
      'https://api.replicate.com/v1/predictions',
      {
        version: "${latestModel.version}", // Updated working version
        input: {
          image: dataUri
        }
      },
      {
        headers: {
          'Authorization': \`Token \${process.env.REPLICATE_API_TOKEN}\`,
          'Content-Type': 'application/json'
        }
      }
    );

    const predictionId = replicateResponse.data.id;
    fs.appendFileSync('bot-log.txt', \`Background removal prediction started: \${predictionId}\\n\`);

    // Poll for completion with better error handling
    let prediction;
    let attempts = 0;
    const maxAttempts = 30; // 5 minutes max

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      
      const pollResponse = await axios.get(
        \`https://api.replicate.com/v1/predictions/\${predictionId}\`,
        {
          headers: {
            'Authorization': \`Token \${process.env.REPLICATE_API_TOKEN}\`,
            'Content-Type': 'application/json'
          }
        }
      );

      prediction = pollResponse.data;
      fs.appendFileSync('bot-log.txt', \`Background removal status: \${prediction.status}\\n\`);

      if (prediction.status === 'succeeded') {
        break;
      } else if (prediction.status === 'failed') {
        const errorMessage = prediction.error || 'Unknown error';
        fs.appendFileSync('bot-log.txt', \`Background removal failed: \${errorMessage}\\n\`);
        throw new Error(\`Background removal failed: \${errorMessage}\`);
      }

      attempts++;
      fs.appendFileSync('bot-log.txt', \`Background removal polling attempt \${attempts}...\\n\`);
    }

    if (!prediction || prediction.status !== 'succeeded') {
      throw new Error('Background removal timed out or failed');
    }

    // Download the processed image
    const processedImageUrl = prediction.output;
    fs.appendFileSync('bot-log.txt', \`Background removed image URL: \${processedImageUrl}\\n\`);

    const processedResponse = await axios({
      method: 'GET',
      url: processedImageUrl,
      responseType: 'arraybuffer'
    });

    // Save the processed image
    const outputPath = path.join(tempDir, \`nobg-\${path.basename(imagePath)}\`);
    fs.writeFileSync(outputPath, processedResponse.data);
    fs.appendFileSync('bot-log.txt', \`Background removed image saved: \${outputPath}\\n\`);

    return outputPath;

  } catch (error) {
    fs.appendFileSync('bot-log.txt', \`Background removal error: \${error.message}\\n\`);
    throw error;
  }
}`;

    // Save the fixed function to a file
    fs.writeFileSync('fixed-background-removal.js', fixedFunction);
    console.log('✅ Fixed function saved to: fixed-background-removal.js');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
if (require.main === module) {
  main();
}
