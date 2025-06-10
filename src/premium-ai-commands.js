// 🎨 Premium AI Commands - Admin Only Features
// Advanced AI generation features for admin testing and premium showcases

const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Admin user ID from environment
const ADMIN_USER_ID = process.env.ADMIN_USER_ID;

// =============================================================================
// FLUX KONTEXT PRO - Advanced Text-to-Image
// =============================================================================

const fluxKontextCommand = {
  data: new SlashCommandBuilder()
    .setName('flux-kontext')
    .setDescription('Generate high-quality images with FLUX Kontext Pro (Admin only)')
    .addStringOption(option =>
      option.setName('prompt')
        .setDescription('Detailed description of the image you want to generate')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('style')
        .setDescription('Image style')
        .setRequired(false)
        .addChoices(
          { name: 'Photorealistic', value: 'photorealistic' },
          { name: 'Artistic', value: 'artistic' },
          { name: 'Anime', value: 'anime' },
          { name: 'Cinematic', value: 'cinematic' },
          { name: 'Fantasy', value: 'fantasy' }
        ))
    .addStringOption(option =>
      option.setName('aspect_ratio')
        .setDescription('Image aspect ratio')
        .setRequired(false)
        .addChoices(
          { name: 'Square (1:1)', value: '1:1' },
          { name: 'Portrait (3:4)', value: '3:4' },
          { name: 'Landscape (4:3)', value: '4:3' },
          { name: 'Widescreen (16:9)', value: '16:9' }
        )),

  async execute(interaction) {
    try {
      // Check if user is admin
      if (interaction.user.id !== ADMIN_USER_ID) {
        return interaction.reply({
          content: '🔒 This is an exclusive admin-only feature. Premium AI generation coming soon for subscribers!',
          ephemeral: true
        });
      }

      await interaction.deferReply();

      const prompt = interaction.options.getString('prompt');
      const style = interaction.options.getString('style') || 'photorealistic';
      const aspectRatio = interaction.options.getString('aspect_ratio') || '1:1';

      // Enhance prompt based on style
      let enhancedPrompt = prompt;
      switch (style) {
        case 'photorealistic':
          enhancedPrompt = `${prompt}, photorealistic, high detail, professional photography, 8k resolution`;
          break;
        case 'artistic':
          enhancedPrompt = `${prompt}, artistic masterpiece, beautiful composition, trending on artstation`;
          break;
        case 'anime':
          enhancedPrompt = `${prompt}, anime style, detailed anime art, vibrant colors, studio quality`;
          break;
        case 'cinematic':
          enhancedPrompt = `${prompt}, cinematic lighting, dramatic composition, movie still, high production value`;
          break;
        case 'fantasy':
          enhancedPrompt = `${prompt}, fantasy art, magical atmosphere, detailed fantasy illustration`;
          break;
      }

      console.log(`🎨 FLUX Kontext generation: ${enhancedPrompt}`);

      // Call FLUX Kontext Pro API
      const response = await axios.post(
        'https://api.replicate.com/v1/models/black-forest-labs/flux-kontext-pro/predictions',
        {
          input: {
            prompt: enhancedPrompt,
            aspect_ratio: aspectRatio,
            num_outputs: 1,
            guidance_scale: 7.5,
            num_inference_steps: 50
          }
        },
        {
          headers: {
            'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const predictionId = response.data.id;
      console.log(`🎨 FLUX prediction started: ${predictionId}`);

      await interaction.followUp({
        content: '🎨 Generating high-quality image with FLUX Kontext Pro... This may take 30-60 seconds.',
        ephemeral: false
      });

      // Poll for completion
      let prediction;
      let attempts = 0;
      const maxAttempts = 20;

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000));

        const pollResponse = await axios.get(
          `https://api.replicate.com/v1/predictions/${predictionId}`,
          {
            headers: {
              'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`
            }
          }
        );

        prediction = pollResponse.data;

        if (prediction.status === 'succeeded') {
          break;
        } else if (prediction.status === 'failed') {
          throw new Error(`Generation failed: ${prediction.error}`);
        }

        attempts++;
      }

      if (!prediction || prediction.status !== 'succeeded') {
        throw new Error('Generation timed out');
      }

      // Download and send the image
      const imageUrl = prediction.output[0];
      const imageResponse = await axios({
        method: 'GET',
        url: imageUrl,
        responseType: 'arraybuffer'
      });

      const tempDir = path.join(__dirname, '../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const filename = `flux-${Date.now()}.png`;
      const imagePath = path.join(tempDir, filename);
      fs.writeFileSync(imagePath, imageResponse.data);

      const embed = new EmbedBuilder()
        .setColor('#ff6b6b')
        .setTitle('🎨 FLUX Kontext Pro Generation')
        .setDescription(`**Prompt:** ${prompt}\n**Style:** ${style}\n**Aspect Ratio:** ${aspectRatio}`)
        .setImage(`attachment://${filename}`)
        .setFooter({ text: 'Generated with FLUX Kontext Pro - Admin Exclusive' });

      await interaction.followUp({
        embeds: [embed],
        files: [{ attachment: imagePath, name: filename }]
      });

      // Cleanup
      setTimeout(() => {
        try {
          fs.unlinkSync(imagePath);
        } catch (e) {
          console.error('Cleanup error:', e);
        }
      }, 5000);

    } catch (error) {
      console.error('FLUX Kontext error:', error);
      await interaction.followUp({
        content: `❌ Generation failed: ${error.message}`,
        ephemeral: true
      });
    }
  }
};

// =============================================================================
// FACE-TO-MANY - Face Transformation
// =============================================================================

const faceToManyCommand = {
  data: new SlashCommandBuilder()
    .setName('face-transform')
    .setDescription('Transform faces into different styles (Admin only)')
    .addAttachmentOption(option =>
      option.setName('image')
        .setDescription('Image containing a face to transform')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('style')
        .setDescription('Transformation style')
        .setRequired(true)
        .addChoices(
          { name: 'Anime Character', value: 'anime' },
          { name: 'Oil Painting', value: 'oil_painting' },
          { name: 'Cyberpunk', value: 'cyberpunk' },
          { name: 'Medieval Portrait', value: 'medieval' },
          { name: 'Cartoon Style', value: 'cartoon' }
        )),

  async execute(interaction) {
    try {
      // Check if user is admin
      if (interaction.user.id !== ADMIN_USER_ID) {
        return interaction.reply({
          content: '🔒 This is an exclusive admin-only feature. Face transformation coming soon for premium subscribers!',
          ephemeral: true
        });
      }

      await interaction.deferReply();

      const attachment = interaction.options.getAttachment('image');
      const style = interaction.options.getString('style');

      if (!attachment || !attachment.contentType?.startsWith('image/')) {
        return interaction.followUp({
          content: '❌ Please provide a valid image file.',
          ephemeral: true
        });
      }

      console.log(`👤 Face transformation: ${style}`);

      // Download the input image
      const imageResponse = await axios({
        method: 'GET',
        url: attachment.url,
        responseType: 'arraybuffer'
      });

      const base64Image = Buffer.from(imageResponse.data).toString('base64');
      const dataUri = `data:${attachment.contentType};base64,${base64Image}`;

      // Call Face-to-Many API
      const response = await axios.post(
        'https://api.replicate.com/v1/models/flux-kontext-apps/face-to-many-kontext/predictions',
        {
          input: {
            image: dataUri,
            style: style,
            num_outputs: 1
          }
        },
        {
          headers: {
            'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const predictionId = response.data.id;

      await interaction.followUp({
        content: '👤 Transforming face... This may take 30-60 seconds.',
        ephemeral: false
      });

      // Poll for completion (similar to above)
      // ... polling logic ...

      // Send result (similar to above)
      // ... result handling ...

    } catch (error) {
      console.error('Face transform error:', error);
      await interaction.followUp({
        content: `❌ Transformation failed: ${error.message}`,
        ephemeral: true
      });
    }
  }
};

// =============================================================================
// KLING VIDEO GENERATION
// =============================================================================

const klingVideoCommand = {
  data: new SlashCommandBuilder()
    .setName('kling-video')
    .setDescription('Generate high-quality videos with Kling AI (Admin only)')
    .addStringOption(option =>
      option.setName('prompt')
        .setDescription('Detailed description of the video you want to generate')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('duration')
        .setDescription('Video duration')
        .setRequired(false)
        .addChoices(
          { name: '5 seconds', value: '5' },
          { name: '10 seconds', value: '10' },
          { name: '15 seconds', value: '15' }
        ))
    .addStringOption(option =>
      option.setName('style')
        .setDescription('Video style')
        .setRequired(false)
        .addChoices(
          { name: 'Cinematic', value: 'cinematic' },
          { name: 'Realistic', value: 'realistic' },
          { name: 'Artistic', value: 'artistic' },
          { name: 'Fantasy', value: 'fantasy' }
        )),

  async execute(interaction) {
    try {
      // Check if user is admin
      if (interaction.user.id !== ADMIN_USER_ID) {
        return interaction.reply({
          content: '🔒 This is an exclusive admin-only feature. AI video generation coming soon for premium subscribers!',
          ephemeral: true
        });
      }

      await interaction.deferReply();

      const prompt = interaction.options.getString('prompt');
      const duration = parseInt(interaction.options.getString('duration') || '5');
      const style = interaction.options.getString('style') || 'cinematic';

      // Enhance prompt based on style
      let enhancedPrompt = prompt;
      switch (style) {
        case 'cinematic':
          enhancedPrompt = `${prompt}, cinematic quality, professional cinematography, dramatic lighting, high production value`;
          break;
        case 'realistic':
          enhancedPrompt = `${prompt}, photorealistic, natural lighting, real world physics, high detail`;
          break;
        case 'artistic':
          enhancedPrompt = `${prompt}, artistic style, creative composition, beautiful visuals, artistic flair`;
          break;
        case 'fantasy':
          enhancedPrompt = `${prompt}, fantasy style, magical atmosphere, otherworldly, enchanting visuals`;
          break;
      }

      console.log(`🎬 Kling video generation: ${enhancedPrompt}`);

      await interaction.followUp({
        content: `🎬 Generating ${duration}-second video with Kling AI... This may take 2-5 minutes for high quality results.`,
        ephemeral: false
      });

      // Call Kling API
      const response = await axios.post(
        'https://api.replicate.com/v1/models/kwaivgi/kling-v1.6-standard/predictions',
        {
          input: {
            prompt: enhancedPrompt,
            duration: duration,
            aspect_ratio: '16:9',
            fps: 24
          }
        },
        {
          headers: {
            'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const predictionId = response.data.id;
      console.log(`🎬 Kling prediction started: ${predictionId}`);

      // Poll for completion with longer timeout for video
      let prediction;
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes max

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000));

        const pollResponse = await axios.get(
          `https://api.replicate.com/v1/predictions/${predictionId}`,
          {
            headers: {
              'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`
            }
          }
        );

        prediction = pollResponse.data;

        if (prediction.status === 'succeeded') {
          break;
        } else if (prediction.status === 'failed') {
          throw new Error(`Video generation failed: ${prediction.error}`);
        }

        // Update progress every 30 seconds
        if (attempts % 6 === 0 && attempts > 0) {
          await interaction.followUp({
            content: `🎬 Still generating... ${Math.floor(attempts * 5 / 60)} minutes elapsed. High-quality video takes time!`,
            ephemeral: false
          });
        }

        attempts++;
      }

      if (!prediction || prediction.status !== 'succeeded') {
        throw new Error('Video generation timed out');
      }

      // Download and send the video
      const videoUrl = prediction.output;
      const videoResponse = await axios({
        method: 'GET',
        url: videoUrl,
        responseType: 'arraybuffer'
      });

      const tempDir = path.join(__dirname, '../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const filename = `kling-${Date.now()}.mp4`;
      const videoPath = path.join(tempDir, filename);
      fs.writeFileSync(videoPath, videoResponse.data);

      const embed = new EmbedBuilder()
        .setColor('#9b59b6')
        .setTitle('🎬 Kling AI Video Generation')
        .setDescription(`**Prompt:** ${prompt}\n**Duration:** ${duration} seconds\n**Style:** ${style}`)
        .setFooter({ text: 'Generated with Kling AI - Admin Exclusive' });

      await interaction.followUp({
        content: '🎬 **High-quality AI video generated!**',
        embeds: [embed],
        files: [{ attachment: videoPath, name: filename }]
      });

      // Cleanup
      setTimeout(() => {
        try {
          fs.unlinkSync(videoPath);
        } catch (e) {
          console.error('Cleanup error:', e);
        }
      }, 10000);

    } catch (error) {
      console.error('Kling video error:', error);
      await interaction.followUp({
        content: `❌ Video generation failed: ${error.message}`,
        ephemeral: true
      });
    }
  }
};

// =============================================================================
// IMAGE-TO-VIDEO CONVERSION
// =============================================================================

const imageToVideoCommand = {
  data: new SlashCommandBuilder()
    .setName('image-to-video')
    .setDescription('Convert static images to cinematic videos (Admin only)')
    .addAttachmentOption(option =>
      option.setName('image')
        .setDescription('Static image to animate')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('motion')
        .setDescription('Type of motion to add')
        .setRequired(false)
        .addChoices(
          { name: 'Subtle Movement', value: 'subtle' },
          { name: 'Dynamic Motion', value: 'dynamic' },
          { name: 'Cinematic Pan', value: 'cinematic' },
          { name: 'Zoom Effect', value: 'zoom' }
        ))
    .addStringOption(option =>
      option.setName('duration')
        .setDescription('Video duration')
        .setRequired(false)
        .addChoices(
          { name: '3 seconds', value: '3' },
          { name: '5 seconds', value: '5' },
          { name: '8 seconds', value: '8' }
        )),

  async execute(interaction) {
    try {
      // Check if user is admin
      if (interaction.user.id !== ADMIN_USER_ID) {
        return interaction.reply({
          content: '🔒 This is an exclusive admin-only feature. Image-to-video conversion coming soon for premium subscribers!',
          ephemeral: true
        });
      }

      await interaction.deferReply();

      const attachment = interaction.options.getAttachment('image');
      const motion = interaction.options.getString('motion') || 'subtle';
      const duration = parseInt(interaction.options.getString('duration') || '5');

      if (!attachment || !attachment.contentType?.startsWith('image/')) {
        return interaction.followUp({
          content: '❌ Please provide a valid image file.',
          ephemeral: true
        });
      }

      console.log(`📸➡️🎬 Image-to-video: ${motion} motion, ${duration}s`);

      // Download the input image
      const imageResponse = await axios({
        method: 'GET',
        url: attachment.url,
        responseType: 'arraybuffer'
      });

      const base64Image = Buffer.from(imageResponse.data).toString('base64');
      const dataUri = `data:${attachment.contentType};base64,${base64Image}`;

      await interaction.followUp({
        content: `📸➡️🎬 Converting your image to a ${duration}-second cinematic video... This may take 1-3 minutes.`,
        ephemeral: false
      });

      // Use enhanced Stable Video Diffusion for image-to-video
      const response = await axios.post(
        'https://api.replicate.com/v1/predictions',
        {
          version: 'd68b6e09eedbac7a49e3d8644999d93579c386a083768235cabca88796d70d82', // Stable Video Diffusion
          input: {
            input_image: dataUri,
            motion_bucket_id: motion === 'subtle' ? 80 : motion === 'dynamic' ? 180 : motion === 'cinematic' ? 127 : 150,
            fps: 24,
            num_frames: duration * 24, // 24 fps
            conditioning_augmentation: 0.02,
            decoding_t: 14
          }
        },
        {
          headers: {
            'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const predictionId = response.data.id;

      // Poll for completion
      let prediction;
      let attempts = 0;
      const maxAttempts = 40;

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000));

        const pollResponse = await axios.get(
          `https://api.replicate.com/v1/predictions/${predictionId}`,
          {
            headers: {
              'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`
            }
          }
        );

        prediction = pollResponse.data;

        if (prediction.status === 'succeeded') {
          break;
        } else if (prediction.status === 'failed') {
          throw new Error(`Image-to-video conversion failed: ${prediction.error}`);
        }

        attempts++;
      }

      if (!prediction || prediction.status !== 'succeeded') {
        throw new Error('Conversion timed out');
      }

      // Download and send the video
      const videoUrl = prediction.output;
      const videoResponse = await axios({
        method: 'GET',
        url: videoUrl,
        responseType: 'arraybuffer'
      });

      const tempDir = path.join(__dirname, '../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const filename = `img2vid-${Date.now()}.mp4`;
      const videoPath = path.join(tempDir, filename);
      fs.writeFileSync(videoPath, videoResponse.data);

      const embed = new EmbedBuilder()
        .setColor('#00d2d3')
        .setTitle('📸➡️🎬 Image-to-Video Conversion')
        .setDescription(`**Motion Style:** ${motion}\n**Duration:** ${duration} seconds\n**Quality:** Cinematic 24fps`)
        .setFooter({ text: 'Converted with Stable Video Diffusion - Admin Exclusive' });

      await interaction.followUp({
        content: '🎬 **Your image has been brought to life!**',
        embeds: [embed],
        files: [{ attachment: videoPath, name: filename }]
      });

      // Cleanup
      setTimeout(() => {
        try {
          fs.unlinkSync(videoPath);
        } catch (e) {
          console.error('Cleanup error:', e);
        }
      }, 10000);

    } catch (error) {
      console.error('Image-to-video error:', error);
      await interaction.followUp({
        content: `❌ Conversion failed: ${error.message}`,
        ephemeral: true
      });
    }
  }
};

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  fluxKontextCommand,
  faceToManyCommand,
  klingVideoCommand,
  imageToVideoCommand
};
