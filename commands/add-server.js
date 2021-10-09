const {SlashCommandBuilder} = require('@discordjs/builders');
const EmbedGenerator = require("../dofus/EmbedGenerator");

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
            return await interaction.editReply(new EmbedGenerator(true, "Server Prefix", interaction.user).simpleText(message))
        } else {
            return await interaction.reply(new EmbedGenerator(false, "Delete Server", interaction.user).simpleText(`You are not authorized to perform this interaction. Only the bot owner has access to this command.`));
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
