require("dotenv").config()
const fs = require('fs');
const keepAlive = require("./dofus/expressServer")
const {Client, Collection, Intents, Permissions} = require('discord.js');
const EventEmitter = require('events');
const MongoHelper = require('./dofus/MongoHelper.js')
const {parseMember, parseMemberList, parseIdFromMention, parseLeaderboardArgs} = require("./dofus/discordParser")
const {
    generateExampleCommands,
    scoreDomainsErrorGenerator,
    scoreRangeErrorGenerator,
    insufficientArgumentsErrorGenerator
} = require("./dofus/stringModifier")
const EmbedGenerator = require("./dofus/EmbedGenerator")
const eventEmitter = new EventEmitter();
const db = new MongoHelper("dofus", eventEmitter)
let guildCache = {}
let scoreDomains = ["attack", "defence", "koth", "pvm"]
scoreDomains.sort()

const client = new Client({intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MEMBERS]});
client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
}

const hasModPerms = (guildId, member) => {
    let modRoles = guildCache[guildId].modRoles
    if (modRoles.length === 0) {
        return true
    } else {
        let memberRoles = member.roles.cache
        let modPerm = hasAdminPerms(member);
        if (modPerm === false) {
            modPerm = modRoles.some(roleId => memberRoles.has(roleId))
        }
        return modPerm
    }

}

const hasAdminPerms = (member) => {
    return member.permissions.has("ADMINISTRATOR")
}

client.once('ready', async () => {
    console.log('Connecting to MongoDB!');
    await db.connect()
    console.log('Connected!');
    guildCache = await db.getGuildCache();
    console.log('Ready for use!')
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;
    const command = client.commands.get(interaction["commandName"]);
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


client.on('messageCreate', async message => {
    if (message.author.bot) return;
    const guildId = message.guildId
    if (guildCache[guildId]) {
        const prefix = guildCache[guildId].prefix
        if (message.content.substring(0, prefix.length) === prefix) {
            if (message.guild.me.permissionsIn(await message.guild.channels.fetch(message.channelId)).has([Permissions.FLAGS.READ_MESSAGE_HISTORY, Permissions.FLAGS.SEND_MESSAGES])) {
                let args = message.content.slice(prefix.length).trim().split(/\s+/);
                const command = args.shift().toLowerCase();
                if (command === 'ping') {
                    const embed = new EmbedGenerator(true, "Pong!", message.author);
                    await message.reply(embed.simpleText(`Latency : ${Math.round(client.ws.ping)}ms`));
                } else if (scoreDomains.includes(command)) {
                    if (hasModPerms(guildId, message.member)) {
                        if (args.length > 0) {
                            args.sort()
                            let score = (parseInt(args[0]) > 0 && args[0].length < 16) ? parseInt(args.shift()) : 1;
                            if (score > 0 && score <= 100) {
                                let result = await parseMemberList(args, message.guild, guildCache[guildId].guildRoles)
                                let foundUsers = result.filter(entity => (entity.isGuildRole === true || entity.type === 'user'))
                                foundUsers.length > 0 ? await db.updateScores(scoreDomains, guildId, command, foundUsers, score) : {}
                                return await message.reply(new EmbedGenerator(true, `${command} Command`, message.author).scoreChange(command, result, score, "add"));
                            } else {
                                return await message.reply(new EmbedGenerator(false, `${command} Command Error`, message.author).simpleText(scoreDomainsErrorGenerator(prefix, command, scoreDomains)))
                            }
                        } else {
                            return await message.reply(new EmbedGenerator(false, `${command} Command Error`, message.author).simpleText(insufficientArgumentsErrorGenerator(prefix, command, scoreDomains)))
                        }
                    } else {
                        return await message.reply(new EmbedGenerator(false, `${command} Command Error`, message.author).permissionError())
                    }
                } else if (command === "set") {
                    if (hasModPerms(guildId, message.member)) {
                        if (args.length > 2) {
                            let scoreDomain = args.shift().toLowerCase();
                            if (scoreDomains.includes(scoreDomain)) {
                                let score = parseInt(args.shift())
                                if (score > 0 && score <= 100) {
                                    let result = await parseMemberList(args, message.guild, guildCache[guildId].guildRoles)
                                    let foundUsers = result.filter(entity => (entity.isGuildRole === true || entity.type === 'user'))
                                    foundUsers.length > 0 ? await db.setScores(guildId, scoreDomain, foundUsers, score) : {}
                                    return await message.reply(new EmbedGenerator(true, `${command} Command`, message.author).scoreChange(scoreDomain, result, score, "set"));
                                } else {
                                    return await message.reply(new EmbedGenerator(false, `${command} Command Error`, message.author).simpleText(scoreRangeErrorGenerator(prefix, command, scoreDomains)))
                                }
                            } else {
                                return await message.reply(new EmbedGenerator(false, `${command} Command Error`, message.author).simpleText(scoreDomainsErrorGenerator(prefix, command, scoreDomains)))
                            }
                        } else {
                            return await message.reply(new EmbedGenerator(false, `${command} Command Error`, message.author).simpleText(insufficientArgumentsErrorGenerator(prefix, command, scoreDomains)))
                        }
                    } else {
                        await message.reply(new EmbedGenerator(false, `${command} Error`, message.author).permissionError())
                    }
                } else if (command === "remove") {
                    if (hasModPerms(guildId, message.member)) {
                        if (args.length > 2) {
                            let scoreDomain = args.shift().toLowerCase();
                            if (scoreDomains.includes(scoreDomain)) {
                                let score = parseInt(args.shift());
                                if (score > 0 && score <= 100) {
                                    let result = await parseMemberList(args, message.guild, guildCache[guildId].guildRoles)
                                    let foundUsers = result.filter(entity => (entity.isGuildRole === true || entity.type === 'user'))
                                    foundUsers.length > 0 ? await db.updateScores(scoreDomains, guildId, scoreDomain, foundUsers, score * -1, true) : {}
                                    return await message.reply(new EmbedGenerator(true, `${command} Command`, message.author).scoreChange(scoreDomain, result, score, "del"));
                                } else {
                                    return await message.reply(new EmbedGenerator(false, `${command} Command Error`, message.author).simpleText(scoreRangeErrorGenerator(prefix, command, scoreDomains)))
                                }
                            } else {
                                return await message.reply(new EmbedGenerator(false, `${command} Command Error`, message.author).simpleText(scoreDomainsErrorGenerator(prefix, command, scoreDomains)))
                            }
                        } else {
                            return await message.reply(new EmbedGenerator(false, `${command} Command Error`, message.author).simpleText(insufficientArgumentsErrorGenerator(prefix, command, scoreDomains)))
                        }
                    } else {
                        await message.reply(new EmbedGenerator(false, `${command} Command Error`, message.author).permissionError())
                    }
                } else if (command === "profile" || command === "score") {
                    let entity = parseMember(args.length > 0 ? args.shift() : message.author.id, await message.guild.members.fetch(), guildCache[guildId].guildRoles, message.guild.roles.cache)
                    if (entity.type === 'user' || entity.isGuildRole === true) {
                        if (entity.type === 'role') {
                            entity.scoreCard = await db.getScore(scoreDomains, guildId, entity.id, true)
                            return await message.reply(new EmbedGenerator(true, `Guild Profile`, message.author).roleProfile(entity, scoreDomains))
                        } else {
                            entity.scoreCard = await db.getScore(scoreDomains, guildId, entity.id)
                            return await message.reply(new EmbedGenerator(true, `User Profile`, message.author).userProfile(entity, scoreDomains))
                        }
                    } else {
                        let text = (entity.type === 'bot') ? 'Bots cannot have Score Cards' : '';
                        text = (entity.type === 'role' && text === '') ? 'The mentioned role is not registered as Guild Role' : "The mention provided in your command could not be identified"
                        return await message.reply(new EmbedGenerator(false, `Profile Command`, message.author).simpleText(text))
                    }
                } else if (command === "top" || command === "leaderboard" || command === "topmembers" || command === "leaderboards") {
                    let response = parseLeaderboardArgs(args, scoreDomains)
                    if (response.domainError) {
                        return await message.reply(new EmbedGenerator(false, `Member Leaderboard Command`, message.author).simpleText(scoreDomainsErrorGenerator(prefix, command, scoreDomains)))
                    }
                    if (response.scoreError) {
                        return await message.reply(new EmbedGenerator(false, `Member Leaderboard Command`, message.author).simpleText(`The leaderboard size should be between 5 and 100\n${generateExampleCommands(prefix, command, scoreDomains)}`))
                    }
                    let {limit, scoreDomain} = response
                    let scores = await db.getScores(scoreDomains, guildId, scoreDomain)
                    if (scores.length > 0) {
                        scores = scores.slice(0, limit);
                        return await message.reply(new EmbedGenerator(true, `Top ${limit} ${scoreDomain} Member Scores`, message.author).leaderboard(scores, scoreDomain))
                    } else {
                        return await message.reply(new EmbedGenerator(false, `Member Leaderboard Command`, message.author).simpleText(`No Scores to show, try adding scores to members!`))
                    }
                } else if (command === "topguild" || command === "leaderboardguild" || command === "topguilds" || command === "leaderboardguilds") {
                    let response = parseLeaderboardArgs(args, scoreDomains)
                    if (response.domainError) {
                        return await message.reply(new EmbedGenerator(false, `Guild Leaderboard Command`, message.author).simpleText(scoreDomainsErrorGenerator(prefix, command, scoreDomains)))
                    }
                    if (response.scoreError) {
                        return await message.reply(new EmbedGenerator(false, `Guild Leaderboard Command`, message.author).simpleText(`The leaderboard size should be between 5 and 100\n${generateExampleCommands(prefix, command, scoreDomains)}`))
                    }
                    let {limit, scoreDomain} = response
                    let scores = await db.getScores(scoreDomains, guildId, scoreDomain, true)
                    if (scores.length > 0) {
                        scores = scores.slice(0, limit);
                        return await message.reply(new EmbedGenerator(true, `Top ${limit} ${scoreDomain} Guild Scores`, message.author).leaderboard(scores, scoreDomain))
                    } else {
                        return await message.reply(new EmbedGenerator(false, `Guild Leaderboard Command`, message.author).simpleText(`No Scores to show, try adding scores to guilds!`))
                    }
                } else if (command === "reset") {
                    if (hasAdminPerms(message.member)) {
                        await db.resetGuild(guildId)
                        return await message.reply(new EmbedGenerator(true, `Reset Command`, message.author).simpleText(`All Scores have been reset as requested`))
                    } else {
                        return await message.reply(new EmbedGenerator(true, command, message.author).permissionError())
                    }
                } else if (command === "addmod") {
                    if (hasAdminPerms(message.member)) {
                        if (args.length !== 1) {
                            return await message.reply(new EmbedGenerator(false, `Add Mod Command`, message.author).simpleText(`Only one role can be added at a time.`))
                        }
                        let role = parseIdFromMention(args.shift().toLowerCase()).entityIdentifier
                        role = message.guild.roles.cache.find(r => r.id === role);
                        if (role !== undefined) {
                            role = role.id.toString()
                            let modRoles = guildCache[guildId].modRoles
                            if (modRoles.includes(role)) {
                                return await message.reply(new EmbedGenerator(false, `Add Mod Command`, message.author).simpleText(`Mentioned Role already exists as Mod Role`))
                            } else {
                                modRoles.push(role)
                                await db.updateModRoles(guildId, modRoles)
                                return await message.reply(new EmbedGenerator(true, `Add Mod Command`, message.author).simpleText(`Role has been added successfully`))
                            }
                        } else {
                            return await message.reply(new EmbedGenerator(false, `Add Mod Command`, message.author).simpleText(`Role could not be identified`))
                        }
                    } else {
                        await message.reply(new EmbedGenerator(true, command, message.author).permissionError())
                    }
                } else if (command === "delmod") {
                    if (hasAdminPerms(message.member)) {
                        if (args.length !== 1) {
                            return await message.reply(new EmbedGenerator(false, `Delete Mod Command`, message.author).simpleText(`Only one role can be deleted at a time.`))
                        }
                        let role = parseIdFromMention(args.shift().toLowerCase()).entityIdentifier
                        role = message.guild.roles.cache.find(r => r.id === role)
                        if (role !== undefined) {
                            role = role.id.toString()
                            let modRoles = guildCache[guildId].modRoles
                            if (modRoles.includes(role)) {
                                modRoles = modRoles.filter(item => item !== role);
                                await db.updateModRoles(guildId, modRoles)
                                return await message.reply(new EmbedGenerator(true, `Delete Mod Command`, message.author).simpleText(`Role has been removed successfully`))
                            } else {
                                return await message.reply(new EmbedGenerator(false, `Delete Mod Command`, message.author).simpleText(`The mentioned Role is not a Mod Role`))
                            }
                        } else {
                            return await message.reply(new EmbedGenerator(false, `Delete Mod Command`, message.author).simpleText(`Role could not be identified`))
                        }
                    } else {
                        await message.reply(new EmbedGenerator(true, command, message.author).permissionError())
                    }
                } else if (command === "listmod" || command === "listmods") {
                    let modRoles = guildCache[guildId].modRoles
                    if (modRoles.length > 0) {
                        let modText = "\n"
                        modRoles.forEach((roleId, index) => {
                            let role = message.guild.roles.cache.find(r => r.id === roleId)
                            modText += `${index + 1}. <@&${role.id}>\n`;
                        })
                        return await message.reply(new EmbedGenerator(true, `Mod List`, message.author).simpleText(modText))
                    } else {
                        return await message.reply(new EmbedGenerator(false, `Mod List`, message.author).simpleText(`No Roles have been added yet!`))
                    }
                } else if (command === "addguild") {
                    if (hasAdminPerms(message.member)) {
                        if (args.length !== 1) {
                            return await message.reply(new EmbedGenerator(false, `Add Guild Command`, message.author).simpleText(`Only one role can be added at a time.`))
                        }
                        let role = parseIdFromMention(args.shift().toLowerCase()).entityIdentifier
                        role = message.guild.roles.cache.find(r => r.id === role);
                        if (role !== undefined) {
                            role = role.id.toString()
                            let guildRoles = guildCache[guildId].guildRoles
                            if (guildRoles.includes(role)) {
                                return await message.reply(new EmbedGenerator(false, `Add Guild Command`, message.author).simpleText(`Mentioned Role is already registered as Guild Role`))
                            } else {
                                guildRoles.push(role)
                                await db.updateGuildRoles(guildId, role, guildRoles)
                                return await message.reply(new EmbedGenerator(true, `Add Guild Command`, message.author).simpleText(`Guild Role has been added successfully`))
                            }
                        } else {
                            return await message.reply(new EmbedGenerator(false, `Add Guild Command`, message.author).simpleText(`Mentioned role could not be identified`))
                        }
                    } else {
                        await message.reply(new EmbedGenerator(true, command, message.author).permissionError())
                    }
                } else if (command === "delguild") {
                    if (hasAdminPerms(message.member)) {
                        if (args.length !== 1) {
                            return await message.reply(new EmbedGenerator(false, `Delete Guild Command`, message.author).simpleText(`Only one role can be deleted at a time.`))
                        }
                        let role = parseIdFromMention(args.shift().toLowerCase()).entityIdentifier
                        role = message.guild.roles.cache.find(r => r.id === role)
                        if (role !== undefined) {
                            role = role.id.toString()
                            let guildRoles = guildCache[guildId].guildRoles
                            if (guildRoles.includes(role)) {
                                guildRoles = guildRoles.filter(item => item !== role);
                                await db.updateGuildRoles(guildId, role, guildRoles)
                                return await message.reply(new EmbedGenerator(true, `Delete Guild Command`, message.author).simpleText(`Guild Role has been removed successfully`))
                            } else {
                                return await message.reply(new EmbedGenerator(false, `Delete Guild Command`, message.author).simpleText(`The mentioned Role is not a Guild Role`))
                            }
                        } else {
                            return await message.reply(new EmbedGenerator(false, `Delete Guild Command`, message.author).simpleText(`Role could not be identified`))
                        }
                    } else {
                        await message.reply(new EmbedGenerator(true, command, message.author).permissionError())
                    }
                } else if (command === "listguild" || command === "listguilds") {
                    let guildRoles = guildCache[guildId].guildRoles
                    if (guildRoles.length > 0) {
                        let modText = "\n"
                        guildRoles.forEach((roleId, index) => {
                            let role = message.guild.roles.cache.find(r => r.id === roleId)
                            modText += `${index + 1}. <@&${role.id}>\n`;
                        })
                        return await message.reply(new EmbedGenerator(true, `Guild List`, message.author).simpleText(modText))
                    } else {
                        return await message.reply(new EmbedGenerator(false, `Guild List`, message.author).simpleText(`No Guild Roles have been added yet!`))
                    }
                } else if (command === 'help') {
                    return await message.reply(new EmbedGenerator(true, `Help Section`, message.author).help(prefix, scoreDomains))
                }
            } else {
                const embed = new EmbedGenerator(false, "Bot Permission Error", message.author)
                await message.author.send(embed.simpleText(`I need the following permissions in the channel to attend to your request:\n1. Read Message History\n2. Send Message\n\nPlease allow them for me and try again.\n\nChannel Name : ${message.channel.name}\nServer Name : ${message.guild.name}`));
            }
        }
    }
});

eventEmitter.on('cacheUpdate', async () => {
    guildCache = await db.getGuildCache();
});
keepAlive()
client.login(process.env.TOKEN).then(() => {
});
