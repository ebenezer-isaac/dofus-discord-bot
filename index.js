const fs = require('fs');
const {Client, Collection, Intents} = require('discord.js');
require("dotenv").config()
const EventEmitter = require('events');
const eventEmitter = new EventEmitter();
const MongoHelper = require('./mongodb.js')
const db = new MongoHelper("dofus", eventEmitter)
let prefixes = {}


const client = new Client({intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES]});
client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
}
client.once('ready', async () => {
    console.log('Ready!');
    await db.connect()
    prefixes = await db.getGuildPrefixes();
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
        await command.execute(interaction, db);
    } catch (error) {
        console.error(error);
        return interaction.reply({
            content: `There was an error while executing this command!\n Contact Bot Owner\n Error : ${error}`,
            ephemeral: true
        });
    }
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    const guildId = message.guildId
    if (prefixes[guildId]) {
        const prefix = prefixes[guildId]
        if (message.content.substring(0, prefix.length) === prefix) {
            let args = message.content.slice(prefix.length).trim().split(/\s+/);
            const command = args.shift().toLowerCase();
            console.log(args)
            if (command === 'ping') {
                return message.channel.send(`Latency : ${Date.now() - message.createdTimestamp}ms\nAPI Latency : ${Math.round(client.ws.ping)}ms`);
            }
        // else if (command === 'attack') {
            //         return message.channel.send(`attack`);
            //     }
        }
    }
});

eventEmitter.on('prefixUpdate', async () => {
    prefixes = await db.getGuildPrefixes();
});

client.login(process.env.TOKEN);
