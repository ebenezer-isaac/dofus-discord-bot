const {SlashCommandBuilder} = require('@discordjs/builders');
const EmbedGenerator = require("../dofus/EmbedGenerator")
module.exports = {
    data: new SlashCommandBuilder()
        .setName('del-server')
        .setDescription('Set Current Server as Non-Serviceable'),
    async execute(interaction, db) {
        if (interaction.user.id.toString() === "812756678361350216") {
            await interaction.deferReply();
            let message = await this.delServer(interaction.guildId, db)
            return await interaction.editReply(new EmbedGenerator(true, "Server Prefix", interaction.user).simpleText(message))
        } else {
            return await interaction.reply(new EmbedGenerator(false, "Delete Server", interaction.user).simpleText(`You are not authorized to perform this interaction. Only the bot owner has access to this command.`));
        }
    }, async delServer(guildId, db) {
        await db.connect()
        await db.deleteGuild(guildId)
        return `The current server has been removed from service.`
    }
};
