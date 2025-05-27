import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { getGuildStats, resetGuildUsage, setGuildQuota } from '../services/database';
import pool from '../services/database';

export const data = new SlashCommandBuilder()
  .setName('stickerize-stats')
  .setDescription('View or manage stickerize usage statistics')
  .addSubcommand(subcommand =>
    subcommand
      .setName('view')
      .setDescription('View current usage statistics'))
  .addSubcommand(subcommand =>
    subcommand
      .setName('reset')
      .setDescription('Reset usage counter (Admin only)'))
  .addSubcommand(subcommand =>
    subcommand
      .setName('quota')
      .setDescription('Set monthly quota (Admin only)')
      .addIntegerOption(option =>
        option
          .setName('amount')
          .setDescription('New quota amount')
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(1000)));

export async function execute(interaction: CommandInteraction) {
  // Check if this is a guild command
  if (!interaction.guildId) {
    await interaction.reply({
      content: 'This command can only be used in a server.',
      ephemeral: true
    });
    return;
  }

  const subcommand = (interaction.options as any).getSubcommand();

  if (subcommand === 'view') {
    await handleViewStats(interaction);
  } else if (subcommand === 'reset') {
    await handleResetStats(interaction);
  } else if (subcommand === 'quota') {
    await handleSetQuota(interaction);
  }
}

async function handleViewStats(interaction: CommandInteraction) {
  await interaction.deferReply();

  try {
    // Get guild stats
    const guildStats = await getGuildStats(interaction.guildId!);

    // Get total cost for the guild
    const costResult = await pool.query(
      'SELECT SUM(cost) as total_cost FROM usage WHERE guild_id = $1',
      [interaction.guildId]
    );
    const totalCost = costResult.rows[0]?.total_cost || 0;

    // Get average processing time
    const timeResult = await pool.query(
      'SELECT AVG(gpu_minutes) as avg_time FROM usage WHERE guild_id = $1',
      [interaction.guildId]
    );
    const avgTime = timeResult.rows[0]?.avg_time || 0;

    // Create embed
    const embed = new EmbedBuilder()
      .setTitle('Stickerize Statistics')
      .setColor(0x00AAFF)
      .addFields(
        { name: 'Usage', value: `${guildStats.usage}/${guildStats.quota} stickers this month`, inline: true },
        { name: 'Total Cost', value: `$${totalCost.toFixed(2)}`, inline: true },
        { name: 'Avg. Processing Time', value: `${(avgTime * 60).toFixed(1)} seconds`, inline: true },
        { name: 'Last Reset', value: new Date(guildStats.last_reset).toLocaleDateString(), inline: true }
      )
      .setFooter({ text: 'Stickerize Bot' })
      .setTimestamp();

    await interaction.followUp({ embeds: [embed] });
  } catch (error: any) {
    console.error('Error getting stats:', error);
    await interaction.followUp({
      content: `An error occurred: ${error.message}`,
      ephemeral: true
    });
  }
}

async function handleResetStats(interaction: CommandInteraction) {
  // Check if user has admin permissions
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({
      content: 'You need administrator permissions to reset stats.',
      ephemeral: true
    });
    return;
  }

  await interaction.deferReply();

  try {
    await resetGuildUsage(interaction.guildId!);
    await interaction.followUp({
      content: 'Usage statistics have been reset.',
      ephemeral: false
    });
  } catch (error: any) {
    console.error('Error resetting stats:', error);
    await interaction.followUp({
      content: `An error occurred: ${error.message}`,
      ephemeral: true
    });
  }
}

async function handleSetQuota(interaction: CommandInteraction) {
  // Check if user has admin permissions
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({
      content: 'You need administrator permissions to set quota.',
      ephemeral: true
    });
    return;
  }

  const amount = (interaction.options as any).getInteger('amount');
  if (!amount) {
    await interaction.reply({
      content: 'Please provide a valid quota amount.',
      ephemeral: true
    });
    return;
  }

  await interaction.deferReply();

  try {
    await setGuildQuota(interaction.guildId!, amount);
    await interaction.followUp({
      content: `Monthly quota has been set to ${amount} stickers.`,
      ephemeral: false
    });
  } catch (error: any) {
    console.error('Error setting quota:', error);
    await interaction.followUp({
      content: `An error occurred: ${error.message}`,
      ephemeral: true
    });
  }
}
