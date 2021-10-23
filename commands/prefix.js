const {SlashCommandBuilder} = require('@discordjs/builders');
const EmbedGenerator = require("../dofus/EmbedGenerator")
module.exports = {
    data: new SlashCommandBuilder()
        .setName('prefix')
        .setDescription('Update Prefix for this Server')
        .addStringOption(option => option.setName('prefix').setDescription('New prefix for the Server')),
    async execute(interaction, db) {
        if (interaction.user.id.toString() === "812756678361350216" || interaction.member.permissions.has("ADMINISTRATOR")) {
            let prefix = interaction.options.getString('prefix')
            await interaction.deferReply();
            let message = await this.updatePrefix(interaction.guildId, prefix, db)
            return await interaction.editReply(new EmbedGenerator(true, "Server Prefix", interaction.user).simpleText(message))
        } else {
            return await interaction.reply(new EmbedGenerator(false, "Server Prefix", interaction.user).simpleText(`You are not authorized to perform this interaction. Only admins have access to this command.`))
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
