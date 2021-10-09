const {SlashCommandBuilder} = require('@discordjs/builders');
const EmbedGenerator = require("../dofus/embedGenerator")

module.exports = {
    data: new SlashCommandBuilder()
        .setName('server-info')
        .setDescription('Display info about this server.'),
    async execute(interaction, db) {
        await interaction.deferReply();
        let message = await this.getDetails(interaction.guildId, interaction.guild.name, interaction.guild.memberCount, db)
        return await interaction.editReply(new EmbedGenerator(true, "Server Info", interaction.user).simpleText(message))
    }, async getDetails(guildId, guildName, guildMemberCount, db) {
        await db.connect()
        const status = await db.checkService(guildId);
        let message = ""
        if (status.status) {
            message = `\nStatus: Active\nPrefix: ${status.prefix}`
        } else {
            message = "\nStatus: In-Active\n\nContact Bot Owner to change status"
        }
        return `Server ID: ${guildId}\nServer Name: ${guildName}\nTotal members: ${guildMemberCount}${message}`
    }
};
