const {SlashCommandBuilder} = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('prefix')
        .setDescription('Update Prefix for this Server')
        .addStringOption(option => option.setName('prefix').setDescription('New prefix for the Server')),
    async execute(interaction, db) {
        if (interaction.member.permissions.has("ADMINISTRATOR")) {
            let prefix = interaction.options.getString('prefix')
            await interaction.deferReply();
            let message = await this.updatePrefix(interaction.guildId, prefix, db)
            await interaction.editReply(message)
        } else {
            return interaction.reply({
                content: `You are not authorized to perform this interaction. Only the bot owner has access to this command.`,
                ephemeral: true
            });
        }
    }, async updatePrefix(guildId, prefix, db) {
        await db.connect()
        if (prefix === undefined || prefix === "null" || !prefix) {
            prefix = "$"
        }
        await db.setGuild(guildId, prefix)
        return `The server's prefix has been updated to ${prefix}`
    }
};
