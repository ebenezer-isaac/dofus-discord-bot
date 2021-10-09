const {MongoClient} = require('mongodb');
require("dotenv").config()
module.exports = class MongoHelper {
    constructor(DB_NAME, eventEmitter) {
        this.eventEmitter = eventEmitter;
        this.DB_NAME = DB_NAME
        this.client = new MongoClient(`mongodb+srv://admin:${process.env.MONGO_PWD}@${process.env.MONGO_CLUS}/${this.DB_NAME}?retryWrites=true&w=majority`);
    }

    async connect() {
        this.client = await this.client.connect()
        return true
    }

    async checkService(guildId) {
        let result = await this.client.db(this.DB_NAME).collection("guilds").find({guildId}).project({
            _id: 0,
            prefix: 1,
            status: 1
        }).limit(1).toArray()
        if (result.length > 0) {
            result = result[0]
            result.result = true
            return result
        }
        return {
            result: false
        }
    }

    async deleteGuild(guildId) {
        let response = await this.client.db(this.DB_NAME).collection("guilds").updateOne(
            {guildId}, {$set: {status: false}})
        this.eventEmitter.emit('cacheUpdate');
        return response
    }

    async setGuild(guildId, prefix, status = false) {
        let guild = (status === false) ? {guildId, prefix} : {guildId, prefix, status}
        await this.client.db(this.DB_NAME).collection("guilds").updateOne(
            {guildId},
            {$set: guild},
            {upsert: true}
        )
        if (status) {
            let response = await this.client.db(this.DB_NAME).collection("guilds").findOne({guildId})
            console.log(response);
            if (response.members === undefined || response.modRoles === undefined || response.guilds === undefined) {
                let updateObject = {};
                (response.memberScores === undefined) ? updateObject.memberScores = {} : {};
                (response.guildRoleScores === undefined) ? updateObject.guildRoleScores = {} : {};
                (response.modRoles === undefined) ? updateObject.modRoles = [] : {};
                (response.guildRoles === undefined) ? updateObject.guildRoles = [] : {};
                await this.client.db(this.DB_NAME).collection("guilds").updateOne(
                    {guildId},
                    {$set: updateObject},
                    {upsert: true}
                )
            }
        }
        this.eventEmitter.emit('cacheUpdate');
        return true
    }

    async resetGuild(guildId) {
        await this.client.db(this.DB_NAME).collection("guilds").updateOne(
            {guildId},
            {$set: {memberScores: {}, guildRoleScores: {}}},
            {upsert: true}
        )
    }

    async updateModRoles(guildId, modRoles) {
        let response = await this.client.db(this.DB_NAME).collection("guilds").updateOne(
            {guildId},
            {$set: {modRoles}},
            {upsert: true}
        )
        this.eventEmitter.emit('cacheUpdate');
        return response
    }

    async updateGuildRoles(guildId, roleId, guildRoles) {
        let updateObject = {}
        updateObject[`guildRoleScores.${roleId}`] = {};
        let response = await this.client.db(this.DB_NAME).collection("guilds").updateOne(
            {guildId},
            {$set: {guildRoles}, $unset: updateObject},
            {upsert: true}
        )
        this.eventEmitter.emit('cacheUpdate');
        return response
    }


    async getActiveGuilds() {
        let result = await this.client.db(this.DB_NAME).collection("guilds").find({status: true}).project({
            _id: 0,
            guildId: 1,
        }).toArray()
        let final = []
        result.forEach(guild => {
            final.push(guild.guildId)
        })
        return final
    }

    async getGuildCache() {
        let result = await this.client.db(this.DB_NAME).collection("guilds").find({status: true}).project({
            _id: 0,
            guildId: 1,
            prefix: 1,
            modRoles: 1,
            guildRoles: 1
        }).toArray()
        let final = {}
        result.forEach(guild => {
            final[guild.guildId] = {
                prefix: guild.prefix,
                modRoles: (guild.modRoles === undefined) ? [] : guild.modRoles,
                guildRoles: (guild.guildRoles === undefined) ? [] : guild.guildRoles,
            }
        })
        return final
    }

    async getScore(scoreDomains, guildId, id, role = false) {
        let scoreList = await this.getScores(scoreDomains, guildId, 'total', role)
        console.log("getScore", scoreList)
        for (let index = 0; index < scoreList.length; index++) {
            if (scoreList[index].id === id) {
                scoreList[index].rank = index + 1
                return scoreList[index]
            }
        }
        let response = {type: role ? 'role' : 'user', id, rank: 0, total: 0}
        scoreDomains.forEach(scoreDomain => {
            response[scoreDomain] = 0
        })
        return response
    }


    async getScores(scoreDomains, guildId, scoreDomain, role = false) {
        let key = role ? 'guildRoleScores' : 'memberScores'
        let type = role ? 'role' : 'user'
        let projection = {_id: 0}
        projection[key] = 1
        const result = await this.client.db(this.DB_NAME).collection("guilds").find({
            guildId,
            status: true
        }).project(projection).toArray()
        let scores = [];
        if (result[0][key] !== undefined && result[0][key] !== null) {
            for (const [id, score] of Object.entries(result[0][key])) {
                score.total = 0;
                score.type = type
                scoreDomains.forEach(scoreDomain => {
                    (score[scoreDomain] === undefined) ? score[scoreDomain] = 0 : {}
                    score.total += score[scoreDomain]
                })
                scores.push({
                    id,
                    ...score
                })
            }
        }
        scores.sort(function (x, y) {
            if (x[scoreDomain] < y[scoreDomain]) {
                return 1;
            }
            if (x[scoreDomain] > y[scoreDomain]) {
                return -1;
            }
            return 0;
        });
        return scores
    }

    processUpdateObject(entities, scoreDomain, score) {
        let updateObject = {}
        entities.forEach(entity => {
            if (entity.type === "user") {
                updateObject[`memberScores.${entity.id}.${scoreDomain}`] = score
            } else if (entity.type === "role")
                updateObject[`guildRoleScores.${entity.id}.${scoreDomain}`] = score
        })
        return updateObject
    }

    async setScores(guildId, scoreDomain, entities, score) {
        let updateObject = this.processUpdateObject(entities, scoreDomain, score)
        return await this.client.db(this.DB_NAME).collection("guilds").updateOne(
            {guildId, status: true},
            {$set: updateObject},
            {upsert: true})
    }

//updateScores(scoreDomains, guildId, command, foundUsers, score * -1) : {}
    async updateScores(scoreDomains, guildId, scoreDomain, entities, score, checkNeg = false) {
        let updateObject = this.processUpdateObject(entities, scoreDomain, score)
        let response = await this.client.db(this.DB_NAME).collection("guilds").updateOne(
            {guildId, status: true},
            {$inc: updateObject},
            {upsert: true})
        if (checkNeg) {
            await this.removeNegativeScores(scoreDomains, guildId)
        }
        return response
    }

    async removeNegativeScores(scoreDomains, guildId) {
        let updateObject = {}
        let userScores = await this.getScores(scoreDomains, guildId, 'total')
        let roleScores = await this.getScores(scoreDomains, guildId, 'total', true)
        userScores.forEach(score => {
            scoreDomains.forEach(command => {
                if (score[command] !== undefined && score[command] < 0) {
                    updateObject[`memberScores.${score.id}.${command}`] = 0;
                }
            })
        })
        roleScores.forEach(score => {
            scoreDomains.forEach(command => {
                if (score[command] !== undefined && score[command] < 0) {
                    updateObject[`guildRoleScores.${score.id}.${command}`] = 0;
                }
            })
        })
        await this.client.db(this.DB_NAME).collection("guilds").updateOne(
            {guildId, status: true},
            {$set: updateObject},
            {upsert: true})
    }
}