const fs = require('fs');
const {Client, Collection, Intents} = require('discord.js');
require("dotenv").config()
const EventEmitter = require('events');
const eventEmitter = new EventEmitter();
const MongoHelper = require('./mongodb.js')
const db = new MongoHelper("dofus", eventEmitter)
let prefixes = {}
let memberNotif = "Note : Mentions/UserID/UserTag can be identified as valid members \n"

const client = new Client({intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES]});
client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
}
client.once('ready', async () => {
    console.log('Connecting!');
    await db.connect()
    console.log('Ready!');
    prefixes = await db.getGuildPrefixes();
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
        await command.execute(interaction, db);
    } catch (error) {
        console.log("error detected")
        console.error(error);
        return interaction.editReply({
            content: `There was an error while executing this command!\n Contact Bot Owner\n Error : ${error}`,
            ephemeral: true
        });
    }
});

const toCamelCase = (text) => {
    return text.charAt(0).toUpperCase() + text.slice(1)
}

const parseMemberList = (command, foundText, notFoundText, memberList) => {
    let notFoundCount = 1
    let members = []
    memberList.forEach((member) => {
        if (parseMember(member).status) {
            const id = parseMember(member).id
            members.push(id)
            foundText += `${members.length}. <@!${id}>\n`;
        } else {
            notFoundText += `${notFoundCount++}. ${member}\n`
        }
    })
    return {
        members,
        text: `${notFoundCount > 1 ? `${notFoundText} ${memberNotif}` : ""} \n ${members.length > 0 ? `${toCamelCase(command)} ${foundText}` : "No members were identified, Please try again"}`
    }
}
const parseMember = (member) => {
    if (member.startsWith("<@!") && member.endsWith(">") && member.length === 22 && member.match(/\d+/g) != null) {
        member = member.substring(3, member.length - 1)
    }
    if (member.length === 18 && member.match(/\d+/g) != null) {
        let guildMember = client.users.cache.find(user => user.id === member)
        if (guildMember === undefined) {
            return {status: true, name: "Member Not Found in Server (" + member + ")", id: member}
        }
        return {status: true, name: guildMember.tag, id: guildMember.id}
    }
    let guildMember = client.users.cache.find(user => user.tag === member)
    if (guildMember === undefined) {
        return {status: false}
    }
    return {status: true, name: guildMember.tag, id: guildMember.id}
}

const generateExampleCommands = (command) => {
    return `Example Commands : \n1. !${command} attack 1 @member\n2. !${command} defence 4 @member\n\n`
}

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    const guildId = message.guildId
    if (prefixes[guildId]) {
        const prefix = prefixes[guildId]
        if (message.content.substring(0, prefix.length) === prefix) {
            let args = message.content.slice(prefix.length).trim().split(/\s+/);
            const command = args.shift().toLowerCase();
            if (command === 'ping') {
                return message.channel.send(`Pong! ${Math.round(client.ws.ping)}ms`);
            } else if (["attack", "defence", "koth"].includes(command)) {
                args.sort()
                let score = (parseInt(args[0]) > 0 && args[0].length < 18) ? parseInt(args.shift()) : 1;
                if (score <= 100) {
                    let result = parseMemberList(command, `Scores for the following members have been increased by ${score}\n`, "Some members weren't identified from your command :\n", args)
                    result.members.length > 0 ? await db.updateScores(guildId, command, result.members, score) : {}
                    return message.channel.send(result.text);
                } else {
                    return message.channel.send("Change in Score cannot be greater than 100")
                }
            } else if (command === "set") {
                if (args.length > 2) {
                    let command = args.shift().toLowerCase();
                    if (["attack", "defence", "koth"].includes(command)) {
                        let score = parseInt(args.shift())
                        if (score > 0 && score <= 100) {
                            let result = parseMemberList(command, `Scores for the following members have been set to ${score}\n`, "Some members weren't identified from your command :\n", args)
                            result.members.length > 0 ? await db.setScores(guildId, command, result.members, score) : {}
                            return message.channel.send(result.text)
                        } else {
                            return message.channel.send(`There was an error with the score specified in your command\n${generateExampleCommands("set")}Change in score cannot be negative and cannot be greater than 100`);
                        }
                    } else {
                        return message.channel.send(`There was an error with the score domain in your command\n${generateExampleCommands("set")}Set command has to be followed by attack/defence/koth. None of them were found`)
                    }
                } else {
                    return message.channel.send(`Sufficient arguments were not found in your command\n${generateExampleCommands("set")}`)
                }
            } else if (command === "remove") {
                if (args.length > 2) {
                    let command = args.shift().toLowerCase();
                    if (["attack", "defence", "koth"].includes(command)) {
                        let score = parseInt(args.shift());
                        if (score > 0 && score <= 100) {
                            let result = parseMemberList(command, `Scores for the following members have been reduced by ${score}\n`, "Some members weren't identified from your command :\n", args)
                            score *= -1;
                            result.members.length > 0 ? await db.updateScores(guildId, command, result.members, score, true) : {}
                            return message.channel.send(result.text);
                        } else {
                            return message.channel.send(`There was an error with the score specified in your command\n${generateExampleCommands("remove")}Change in score cannot be negative and cannot be greater than 100`);
                        }
                    } else {
                        return message.channel.send(`There was an error with the score domain in your command\n${generateExampleCommands("remove")}Remove command has to be followed by attack/defence/koth. None of them were found`)
                    }
                } else {
                    return message.channel.send(`Sufficient arguments were not found in your command\n${generateExampleCommands("remove")}`)
                }
            } else if (command === "profile" || command === "score") {
                let scoreCard = {
                    name: message.author.tag,
                    id: message.author.id
                }
                args.length > 0 ? scoreCard = parseMember(args.shift()) : {}
                let scores = await db.getUserScore(message.guildId, scoreCard.id);
                return message.channel.send(`User ID : ${scoreCard.id}\nUser Name : ${scoreCard.name}\nAttack : ${(scores.attack) ? scores.attack : 0}\nDefence :${(scores.defence) ? scores.defence : 0}\nKoth : ${(scores.koth) ? scores.koth : 0}\nTotal : ${(scores.total) ? scores.total : 0}`)
            } else if (command === "top" || command === "leaderboard") {
                let leaderboard = "";
                let limit = 10
                if (args.length > 0) {
                    limit = parseInt(args.shift())
                    if (limit < 5 || limit > 100) {
                        return message.channel.send(`The leaderboard size should be between 5 and 100\nExample Commands :\n1. !top 25 attack\n2. !top 5 defence`)
                    }
                }
                let scores = await db.getUserScores(guildId)
                let command = "total"
                if (args.length > 0) {
                    command = args.shift().toLowerCase()
                    if (!["attack", "defence", "koth", "total"].includes(command)) {
                        return message.channel.send(`There was an error with the score domain in your command\nExample Commands :\n1. !top attack\n2. !top defence\n\nTop command has to be followed by attack/defence/koth. None of them were found`)
                    }
                }
                scores.sort(function (x, y) {
                    if (x[command] < y[command]) {
                        return 1;
                    }
                    if (x[command] > y[command]) {
                        return -1;
                    }
                    return 0;
                });
                scores = scores.slice(0, limit);
                scores.forEach(score => {
                    let member = parseMember(score.userId)
                    leaderboard += `${member.name} --- ${score[command]}\n`;
                })
                return message.channel.send(`Server Leaderboard --- Top ${limit} (${toCamelCase(command)}) : \n\n${leaderboard}`)
            } else if (command === "reset") {
                if (message.member.permissions.has("ADMINISTRATOR")) {
                    await db.resetGuild(guildId)
                    return message.channel.send(`All Scores have been reset as requested`)
                } else {
                    return message.channel.send(`Administrator permissions are required to execute this command`)
                }
            }
        }
    }
});

eventEmitter.on('prefixUpdate', async () => {
    prefixes = await db.getGuildPrefixes();
});

client.login(process.env.TOKEN);
