function parseIdFromMention(mention) {
    if (mention.startsWith("<@!") && mention.endsWith(">")) {
        return {
            entityIdentifier: mention.substring(3, mention.length - 1),
            type: 'user'
        }
    }
    if (mention.startsWith("<@&") && mention.endsWith(">")) {
        return {
            entityIdentifier: mention.substring(3, mention.length - 1),
            type: 'role'
        }
    }
    if (mention.startsWith("<@") && mention.endsWith(">")) {
        return {
            entityIdentifier: mention.substring(2, mention.length - 1),
            type: 'user'
        }
    }
    return {
        entityIdentifier: mention
    }
}

async function parseMemberList(entityList, guild, guildRoles) {
    let guildMembers = await guild.members.fetch();
    let serverGuildRoles = guild.roles.cache;
    let uniqueEntities = {};
    entityList.forEach(function (entity) {
        entity = parseMember(entity, guildMembers, guildRoles, serverGuildRoles)
        uniqueEntities[entity.id] = entity
    })
    entityList = []
    for (let entityId in uniqueEntities) {
        entityList.push(uniqueEntities[entityId]);
    }
    return entityList
}

function parseMember(text, guildMembers, guildRoles, serverGuildRoles) {
    let {entityIdentifier, type} = parseIdFromMention(text)
    if (entityIdentifier.match(/\d+/g) != null) {
        if (entityIdentifier.length === 17 || entityIdentifier.length === 18) {
            if (type === undefined || type === 'user') {
                let entity = guildMembers.find(user => user.user.id === entityIdentifier)
                if (entity !== undefined) {
                    type = entity.user.bot ? "bot" : "user"
                    return {
                        status: true,
                        nickname: entity.nickname,
                        ...entity.user,
                        type
                    }
                }
            }
            if (type === undefined || type === 'role') {
                let entity = serverGuildRoles.find(r => r.id === entityIdentifier)
                if (entity !== undefined) {
                    if (guildRoles.includes(entityIdentifier)) {
                        return {
                            status: true,
                            ...entity,
                            type: 'role',
                            isGuildRole: true
                        }
                    } else {
                        return {
                            status: true,
                            ...entity,
                            type: 'role',
                            isGuildRole: false
                        }
                    }
                }
            }
        }
    }
    let entity = guildMembers.find(user => `${user.user.username}#${user.user.discriminator}` === entityIdentifier)
    if (entity !== undefined) {
        type = entity.user.bot ? "bot" : "user"
        return {
            status: true,
            nickname: entity.nickname,
            ...entity.user,
            type
        }
    }
    entity = guildMembers.find(user => user.nickname === entityIdentifier)
    if (entity !== undefined) {
        type = entity.user.bot ? "bot" : "user"
        return {
            status: true,
            nickname: entity.nickname,
            ...entity.user,
            type
        }
    }
    return {id: entityIdentifier, status: false}
}

function parseLeaderboardArgs(args, scoreDomains) {
    let response = {
        result: true,
        limit: 10,
        scoreDomain: 'total',
        scoreError: false,
        domainError: false
    }
    args.sort()
    if (args.length > 0 && !isNaN(parseInt(args[0]))) {
        response.limit = parseInt(args.shift())
        if (response.limit < 5 || response.limit > 100) {
            response.result = false
            response.scoreError = true;
        }
    }
    if (args.length > 0) {
        response.scoreDomain = args.shift().toLowerCase()
        if (!scoreDomains.includes(response.scoreDomain)) {
            response.result = false
            response.domainError = true;
        }
    }
    return response

}

module.exports = {
    parseMember,
    parseMemberList,
    parseIdFromMention,
    parseLeaderboardArgs
}