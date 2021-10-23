const {MessageEmbed} = require("discord.js");
const lineSeparator = '----------------------------->\n'
const {
    constructExampleCommands,
    titleCase,
    scoreChangeUserList,
    scoreChangeRoleList,
    scoreChangeGuildRoleList,
    scoreChangeBotList,
    scoreChangeNotFoundList,
    parseEntityIdentifier,
    zeroPad
} = require("./stringModifier");
module.exports = class embedGenerator {
    constructor(success, title, author) {
        this.embed = new MessageEmbed()
        success ? this.embed.setColor('#90fd08') : this.embed.setColor('#FF0000')
        this.embed
            .setTitle(titleCase(title))
            .setFooter(
                `by ${author.username}#${author.discriminator}`,
                `https://cdn.discordapp.com/avatars/${author.id}/${author.avatar}.png`
            ).setTimestamp();
    }

    simpleText(text) {
        this.embed.setDescription(text)
        return this.encloseReply();
    }

    permissionError() {
        this.embed.setDescription("You do not have enough permissions to run this command.")
        return this.encloseReply();
    }

    scoreChange(scoreDomain, arr, score, operation) {
        let scoreUsers = arr.filter(entity => entity.type === 'user');
        if (scoreUsers.length > 0) {
            let field = scoreChangeUserList(scoreDomain, scoreUsers, score, operation)
            this.embed.addField(field.name, field.value, field.inline)
        }
        let scoreRoles = arr.filter(entity => entity.isGuildRole === false);
        if (scoreRoles.length > 0) {
            let field = scoreChangeRoleList(scoreRoles)
            this.embed.addField(field.name, field.value, field.inline)
        }
        let scoreGuildRoles = arr.filter(entity => entity.isGuildRole === true);
        if (scoreGuildRoles.length > 0) {
            let field = scoreChangeGuildRoleList(scoreDomain, scoreGuildRoles, score, operation)
            this.embed.addField(field.name, field.value, field.inline)
        }
        let scoreBots = arr.filter(entity => entity.type === 'bot');
        if (scoreBots.length > 0) {
            let field = scoreChangeBotList(scoreBots)
            this.embed.addField(field.name, field.value, field.inline)
        }
        let scoreNotFound = arr.filter(entity => entity.status === false);
        if (scoreNotFound.length > 0) {
            let field = scoreChangeNotFoundList(scoreNotFound)
            this.embed.addField(field.name, field.value, field.inline)
        }
        return this.encloseReply();
    }

    roleProfile(entity, scoreDomains) {
        this.embed.addField(`${entity.name}`, parseEntityIdentifier(entity), false);
        if (parseInt(entity.scoreCard.rank) > 0) {
            this.embed.addField(`Guild Rank : #\ ${entity.scoreCard.rank}`, '\u200B', false)
        }

        let scoreValues = lineSeparator
        scoreDomains.forEach((scoreDomain) => {
            scoreValues += `${parseInt(entity.scoreCard[scoreDomain])}` + ` -> ` + `${titleCase(scoreDomain)}\n`
        })
        scoreValues += `${lineSeparator}${parseInt(entity.scoreCard.total)}` + ` -> ` + `Total\n${lineSeparator}`
        this.embed.addField(`Score Card\n`, scoreValues, true)
        return this.encloseReply();
    }

    userProfile(entity, scoreDomains) {
        this.embed.addField(`${entity.username}#${entity.discriminator}`, parseEntityIdentifier(entity), false);
        this.embed.setThumbnail(`https://cdn.discordapp.com/avatars/${entity.id}/${entity.avatar}.png`);
        if (parseInt(entity.scoreCard.rank) > 0) {
            this.embed.addField(`Member Rank : #\ ${entity.scoreCard.rank}`, '\u200B', false)
        }
        let lineSeparator = '----------------------------->\n'
        let scoreValues = lineSeparator
        scoreDomains.forEach((scoreDomain) => {
            scoreValues += `${parseInt(entity.scoreCard[scoreDomain])}` + ` -> ` + `${titleCase(scoreDomain)}\n`
        })
        scoreValues += `${lineSeparator}${parseInt(entity.scoreCard.total)}` + ` -> ` + `Total\n${lineSeparator}`
        this.embed.addField(`Score Card\n`, scoreValues, true)
        return this.encloseReply();
    }

    leaderboard(scores, scoreDomain) {
        let lineSeparator = '----------------------------->\n'
        let leaderboardText = lineSeparator
        scores.forEach((entity, index) => {
            leaderboardText += `\ \ ${index + 1}.\ \ ${parseEntityIdentifier(entity)}\ ->\ ${parseInt(entity[scoreDomain])}\n`
        })
        leaderboardText += lineSeparator
        this.embed.addField(`Rank | Mentions -> ${titleCase(scoreDomain)} Score\n`, leaderboardText, true)
        return this.encloseReply();
    }

    help(prefix, scoreDomains) {
        const description = {
            "ping": "Latency between API and Server",
            "set": "Change Scores of Members/Guilds for specific categories\nRequires : Mod Role",
            "remove": "Reduce Scores of Members/Guilds for specific categories\nRequires : Mod Role",
            "profile": "View Profile of Members/Guilds",
            "top": "Display Highest ranking Members for overall or specific categories",
            "topguild": "Display Highest ranking Guilds for overall or specific categories",
            "reset": "Reset Scores for Members and Guilds\nRequires : Administrator Permissions",
            "addmod": "Add Mod Role defining who can change the Scores\nRequires : Administrator Permissions",
            "delmod": "Unregister a previously registered Mod Role\nRequires : Administrator Permissions",
            "listmod": "List all registered Mod Roles",
            "addguild": "Register a Role as Guild Role\nRequires : Administrator Permissions",
            "delguild": "Unregister a previously registered Guild Role\nRequires : Administrator Permissions",
            "listguild": "List all registered Guild Roles",
            "help": "This Page",
        }
        scoreDomains.forEach(scoreDomain => {
            description[scoreDomain] = `Add ${titleCase(scoreDomain)} Scores to Members/Roles\nRequires : Mod Role`
        })
        const exampleCommands = constructExampleCommands(scoreDomains)
        const commandList = Object.keys(exampleCommands)
        commandList.forEach((command, index) => {
            const commands = exampleCommands[command]
            let examples = `Example Command${commands.length > 1 ? "s" : ""} : \n`
            commands.forEach((example, index) => {
                examples += `${index + 1}. ${prefix}${example}\n`
            })
            this.embed.addField(`${index + 1}. ${command}`, `${description[command]}\n${examples}`, false)
        })
        return this.encloseReply();

    }

    encloseReply() {
        return {
            embeds: [this.embed],
            allowedMentions: {repliedUser: false}
        }
    }
}