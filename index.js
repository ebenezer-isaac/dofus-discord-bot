const fs = require('fs');
const keepAlive = require("./server")
const {Client, Collection, Intents} = require('discord.js');
require("dotenv").config()
const EventEmitter = require('events');
const eventEmitter = new EventEmitter();
const MongoHelper = require('./mongodb.js')
const db = new MongoHelper("dofus", eventEmitter)
let prefixes = {}
let memberNotif = "Note : Mentions/UserID/UserTag can be identified as valid members \n"

const client = new Client({intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MEMBERS]});
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

const parseMemberList = async (command, foundText, notFoundText, memberList, guild) => {
    let notFoundCount = 1
    let members = []
    let guildMembers = await guild.members.fetch();
    memberList.forEach((member) => {
        const guildMember = parseMember(member, guildMembers)
        if (guildMember.status) {
            const id = guildMember.id
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
const parseMember = (member, guildMembers) => {

    if (member.startsWith("<@!") && member.endsWith(">") && member.length >= 21 && member.match(/\d+/g) != null) {
        member = member.substring(3, member.length - 1)
    }
    if (member.length >= 17 && member.match(/\d+/g) != null) {
        let guildMember = guildMembers.find(user => user.user.id === member)
        if (guildMember === undefined) {
            return {status: true, name: false, id: member, nickname: false}
        }
        return {
            status: true,
            name: (guildMember.user.username + "#" + guildMember.user.discriminator),
            id: guildMember.user.id,
            nickname: guildMember.nickname
        }
    }
    let guildMember = guildMembers.find(user => (user.user.username + "#" + user.user.discriminator) === member)
    if (guildMember === undefined) {
        guildMember = guildMembers.find(user => user.nickname === member)
        if (guildMember === undefined) {
            return {status: false}
        }
    }
    return {
        status: true,
        name: (guildMember.user.username + "#" + guildMember.user.discriminator),
        id: guildMember.user.id,
        nickname: guildMember.nickname
    }
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
                if (args.length > 0) {
                    args.sort()
                    let score = (parseInt(args[0]) > 0 && args[0].length < 16) ? parseInt(args.shift()) : 1;
                    if (score <= 100) {
                        let result = await parseMemberList(command, `Scores for the following members have been increased by ${score}\n`, "Some members weren't identified from your command :\n", args, message.guild)
                        result.members.length > 0 ? await db.updateScores(guildId, command, result.members, score) : {}
                        return message.channel.send(result.text);
                    } else {
                        return message.channel.send("Change in Score cannot be greater than 100")
                    }
                } else {
                    return message.channel.send(`Sufficient arguments were not found in your command\nAtleast one member needs to be mentioned`)
                }
            } else if (command === "set") {
                if (args.length > 2) {
                    let command = args.shift().toLowerCase();
                    if (["attack", "defence", "koth"].includes(command)) {
                        let score = parseInt(args.shift())
                        if (score > 0 && score <= 100) {
                            let result = await parseMemberList(command, `Scores for the following members have been set to ${score}\n`, "Some members weren't identified from your command :\n", args, message.guild)
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
                            let result = await parseMemberList(command, `Scores for the following members have been reduced by ${score}\n`, "Some members weren't identified from your command :\n", args, message.guild)
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
                let guildMembers = await message.guild.members.fetch();
                args.length > 0 ? scoreCard = parseMember(args.shift(), guildMembers) : {}
                let scores = await db.getUserScore(message.guildId, scoreCard.id);
                return message.channel.send(`User ID : ${scoreCard.id}\nUser Name : ${scoreCard.name}\nAttack : ${scores.attack}\nDefence :${scores.defence}\nKoth : ${scores.koth}\nTotal : ${scores.total}`)
            } else if (command === "top" || command === "leaderboard") {
                let leaderboard = "";
                let limit = 10
                if (args.length > 0 && !isNaN(parseInt(args[0]))) {
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
                let guildMembers = await message.guild.members.fetch();
                scores.forEach((score, index) => {
                    let member = parseMember(score.userId, guildMembers)
                    if (member.nickname) {
                        leaderboard += `${index + 1}. ${member.nickname} --- ${score[command]}\n`;
                    } else if (member.name) {
                        leaderboard += `${index + 1}. ${member.name} --- ${score[command]}\n`;
                    } else {
                        leaderboard += `${index + 1}. ${member.id} --- ${score[command]}\n`;
                    }
                })
                if (scores.length > 0) {
                    return message.channel.send(`Server Leaderboard --- Top ${limit} (${toCamelCase(command)}) : \n\n${leaderboard}`)
                } else {
                    return message.channel.send(`No Scores to show, try adding scores to members!`)
                }
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
keepAlive()
client.login(process.env.TOKEN);
