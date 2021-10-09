const {MessageEmbed} = require("discord.js");
const {
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
        this.embed.addField(`Guild Rank : #\ ${entity.scoreCard.rank}`, '\u200B', false)
        let lineSeparator = '----------------------------->\n'
        let scoreValues = lineSeparator
        scoreDomains.forEach((scoreDomain) => {
            scoreValues += `\|\ \ ${zeroPad(parseInt(entity.scoreCard[scoreDomain]), 3)}` + `\ \ \|\ \ ` + `${titleCase(scoreDomain)}\n`
        })
        scoreValues += `${lineSeparator}\|\ \ ${zeroPad(parseInt(entity.scoreCard.total), 3)}` + `\ \ \|\ \ ` + `Total\n${lineSeparator}`
        this.embed.addField(`Score Card\n`, scoreValues, true)
        return this.encloseReply();
    }

    userProfile(entity, scoreDomains) {
        this.embed.addField(`${entity.username}#${entity.discriminator}`, parseEntityIdentifier(entity), false);
        this.embed.setThumbnail(`https://cdn.discordapp.com/avatars/${entity.id}/${entity.avatar}.png`);
        this.embed.addField(`Member Rank : #\ ${entity.scoreCard.rank}`, '\u200B', false)
        let lineSeparator = '----------------------------->\n'
        let scoreValues = lineSeparator
        scoreDomains.forEach((scoreDomain) => {
            scoreValues += `\|\ \ ${zeroPad(parseInt(entity.scoreCard[scoreDomain]), 3)}` + `\ \ \|\ \ ` + `${titleCase(scoreDomain)}\n`
        })
        scoreValues += `${lineSeparator}\|\ \ ${zeroPad(parseInt(entity.scoreCard.total), 3)}` + `\ \ \|\ \ ` + `Total\n${lineSeparator}`
        this.embed.addField(`Score Card\n`, scoreValues, true)
        return this.encloseReply();
    }

    leaderboard(scores, scoreDomain) {
        let lineSeparator = '----------------------------->\n'
        let leaderboardText = lineSeparator
        scores.forEach((entity, index) => {
            leaderboardText += `\|\ \ ${zeroPad(index + 1, 3)}\ \ \|\ \ ${zeroPad(parseInt(entity[scoreDomain]), 3)}\ \ \|\ \ ${parseEntityIdentifier(entity)}\n`
        })
        leaderboardText += lineSeparator
        this.embed.addField(`Rank | Score | Mentions\n`, leaderboardText, true)
        return this.encloseReply();
    }

    encloseReply() {
        return {
            embeds: [this.embed],
            allowedMentions: {repliedUser: false}
        }
    }
}