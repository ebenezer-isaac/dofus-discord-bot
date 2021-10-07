const {SlashCommandBuilder} = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add-server')
        .setDescription('Register this Server for Service')
        .addStringOption(option => option.setName('prefix').setDescription('Prefix for the Server')),
    async execute(interaction, db) {
        if (interaction.user.id.toString() === "812756678361350216") {
            let prefix = interaction.options.getString('prefix')
            await interaction.deferReply()
            let message = await this.addServer(interaction.guildId, prefix, db)
            await interaction.editReply(message)
        } else {
            return interaction.reply({
                content: `You are not authorized to perform this interaction. Only the bot owner has access to this command.`,
                ephemeral: true
            });
        }
    }, async addServer(guildId, prefix, db) {
        await db.connect()
        if (prefix === undefined || prefix === "null" || !prefix) {
            prefix = "$"
        }
        await db.setGuild(guildId, prefix, true)
        return `The server is registered for service and the prefix has been set as ${prefix}`
    }
};
