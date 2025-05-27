import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, AttachmentBuilder } from 'discord.js';
import { addImageToQueue } from '../services/queue';
import { getGuildStats } from '../services/database';

export const data = new SlashCommandBuilder()
  .setName('stickerize')
  .setDescription('Convert an image to an animated sticker')
  .addAttachmentOption(option => 
    option.setName('image_1')
      .setDescription('The first image to convert')
      .setRequired(true))
  .addAttachmentOption(option => 
    option.setName('image_2')
      .setDescription('The second image to convert (optional)')
      .setRequired(false))
  .addAttachmentOption(option => 
    option.setName('image_3')
      .setDescription('The third image to convert (optional)')
      .setRequired(false));

export async function execute(interaction: CommandInteraction) {
  await interaction.deferReply();
  
  try {
    // Get guild stats to check quota
    const guildStats = await getGuildStats(interaction.guildId!);
    
    // Check if guild has reached quota
    if (guildStats.usage >= guildStats.quota) {
      await interaction.followUp({
        content: `This server has reached its monthly quota of ${guildStats.quota} stickers. Please try again next month or ask an admin to increase the quota.`,
        ephemeral: true
      });
      return;
    }
    
    // Get attachments
    const attachments = [];
    for (let i = 1; i <= 3; i++) {
      const attachment = interaction.options.getAttachment(`image_${i}`);
      if (attachment) {
        attachments.push(attachment);
      }
    }
    
    // Validate attachments
    const validAttachments = attachments.filter(attachment => {
      // Check file size (< 8MB)
      if (attachment.size > 8 * 1024 * 1024) {
        interaction.followUp({
          content: `File ${attachment.name} is too large. Maximum size is 8MB.`,
          ephemeral: true
        });
        return false;
      }
      
      // Check file type
      const validTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
      if (!validTypes.includes(attachment.contentType!)) {
        interaction.followUp({
          content: `File ${attachment.name} is not a valid image type. Supported types: PNG, JPEG, GIF, WEBP.`,
          ephemeral: true
        });
        return false;
      }
      
      return true;
    });
    
    if (validAttachments.length === 0) {
      await interaction.followUp({
        content: 'No valid attachments found. Please attach at least one valid image.',
        ephemeral: true
      });
      return;
    }
    
    // Process each valid attachment
    await interaction.followUp({
      content: `Processing ${validAttachments.length} image(s). This may take up to 60 seconds...`,
      ephemeral: false
    });
    
    // Add each image to the processing queue
    for (const attachment of validAttachments) {
      await addImageToQueue({
        imageUrl: attachment.url,
        userId: interaction.user.id,
        guildId: interaction.guildId!,
        interactionId: interaction.id,
        interactionToken: interaction.token
      });
    }
  } catch (error: any) {
    console.error('Error in stickerize command:', error);
    await interaction.followUp({
      content: `An error occurred: ${error.message}`,
      ephemeral: true
    });
  }
}
