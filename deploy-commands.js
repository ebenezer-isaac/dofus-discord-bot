require("dotenv").config()
const fs = require('fs');
const {REST} = require('@discordjs/rest');
const {Routes} = require('discord-api-types/v9');
const MongoHelper = require('./dofus/MongoHelper.js')
const db = new MongoHelper("dofus")


const commands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    commands.push(command.data.toJSON());
}

const rest = new REST({version: '9'}).setToken(process.env.TOKEN);

async function deployCommands() {
    await db.connect()
    const guilds = await db.getActiveGuilds()
    guilds.forEach(guildId => {
        rest.put(Routes.applicationGuildCommands("894216744611250226", guildId), {body: commands})
            .then(() => console.log(`Successfully registered application commands for Guild ID : ${guildId}`))
            .catch(console.error);
    })
}

deployCommands().then(() => console.log("Commands have been deployed"))