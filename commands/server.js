const {SlashCommandBuilder} = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('server-info')
        .setDescription('Display info about this server.'),
    async execute(interaction, db) {
        this.getDetails(interaction.guildId, interaction.guild.name, interaction.guild.memberCount, db).then(message => {
            interaction.editReply(message)
        })
        await interaction.deferReply();
    }, async getDetails(guildId, guildName, guildMemberCount, db) {
        await db.connect()
        const status = await db.checkService(guildId);
        let message = ""
        if (status.status) {
            message = `\n Status: Active\n Prefix: ${status.prefix}`
        } else {
            message = "\n Status: In-Active\n\n Contact Bot Owner to change status"
        }
        return `Server ID: ${guildId}\nServer Name: ${guildName}\nTotal members: ${guildMemberCount}${message}`
    }
};
