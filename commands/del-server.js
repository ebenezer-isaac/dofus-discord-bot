const {SlashCommandBuilder} = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('del-server')
        .setDescription('Set Current Server as Non-Serviceable'),
    async execute(interaction, db) {
        if (interaction.user.id.toString() === "812756678361350216") {
            this.delServer(interaction.guildId, db).then(message => {
                interaction.editReply(message)
            })
            await interaction.deferReply();
        } else {
            return interaction.reply({
                content: `You are not authorized to perform this interaction. Only the bot owner has access to this command.`,
                ephemeral: true
            });
        }
    }, async delServer(guildId, db) {
        await db.connect()
        await db.deleteGuild(guildId)
        return `The current server has been removed from service.`
    }
};
