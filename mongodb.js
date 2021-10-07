const {MongoClient} = require('mongodb');
module.exports = class MongoHelper {
    constructor(DB_NAME, eventEmitter) {
        this.eventEmitter = eventEmitter;
        this.DB_NAME = DB_NAME
        const uri = "mongodb+srv://admin:00XqPdSPb0QuFK4B@cluster0.nqbag.mongodb.net/dofus?retryWrites=true&w=majority";
        this.client = new MongoClient(uri, {useNewUrlParser: true, useUnifiedTopology: true});
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
        this.eventEmitter.emit('prefixUpdate');
        return response
    }

    async setGuild(guildId, prefix, status) {
        let guild = {guildId, prefix, status}
        await this.client.db(this.DB_NAME).collection("guilds").updateOne(
            {guildId},
            {$set: guild},
            {upsert: true}
        );
        if (status) {
            let response = await this.client.db(this.DB_NAME).collection("guilds").findOne({guildId})
            if (response.scores === undefined) {
                await this.resetGuild(guildId)
            }
        }
        this.eventEmitter.emit('prefixUpdate');
        return true;
    }

    async resetGuild(guildId) {
        await this.client.db(this.DB_NAME).collection("guilds").updateOne(
            {guildId},
            {$set: {scores: {}}},
            {upsert: true}
        )
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

    async getGuildPrefixes() {
        let result = await this.client.db(this.DB_NAME).collection("guilds").find({status: true}).project({
            _id: 0,
            guildId: 1,
            prefix: 1
        }).toArray()
        let final = {}
        result.forEach(guild => {
            final[guild.guildId] = guild.prefix
        })
        return final
    }

    async getUserScore(guildId, userId) {
        const projection = {}
        projection[`scores.${userId}`] = 1
        const result = await this.client.db(this.DB_NAME).collection("guilds").find({
            guildId,
            "status": true
        }).project(projection).toArray()
        if (result[0].scores[userId] === undefined) {
            return {
                attack: 0,
                defence: 0,
                koth: 0,
                total: 0
            }
        }
        let score = result[0].scores[userId];
        score.total = 0;
        ["attack", "defence", "koth"].forEach(command => {
            (score[command] === undefined) ? score[command] = 0 : {}
            score.total += score[command]
        })

        return score;
    }

    async getUserScores(guildId) {
        const result = await this.client.db(this.DB_NAME).collection("guilds").find({
            guildId,
            status: true
        }).project({_id: 0, scores: 1}).toArray()
        let scores = []
        for (const [userId, score] of Object.entries(result[0].scores)) {
            score.total = 0;
            ["attack", "defence", "koth"].forEach(command => {
                (score[command] === undefined) ? score[command] = 0 : {}
                score.total += score[command]
            })
            scores.push({
                userId,
                ...score
            })
        }
        return scores
    }

    async setScores(guildId, command, members, score) {
        let updateObject = {}
        members.forEach(member => {
            updateObject[`scores.${member}.${command}`] = score
        })
        return await this.client.db(this.DB_NAME).collection("guilds").updateOne(
            {guildId, status: true},
            {$set: updateObject},
            {upsert: true})
    }

    async updateScores(guildId, command, members, score, checkNeg = false) {
        let updateObject = {}
        members.forEach(member => {
            updateObject[`scores.${member}.${command}`] = score
        })
        let response = await this.client.db(this.DB_NAME).collection("guilds").updateOne(
            {guildId, status: true},
            {$inc: updateObject},
            {upsert: true})
        if (checkNeg) {
            let updateObject = {}
            let scores = await this.getUserScores(guildId)
            scores.forEach(score => {
                ["attack", "defence", "koth"].forEach(command => {
                    if (score[command] !== undefined && score[command] < 0) {
                        updateObject[`scores.${score.userId}.${command}`] = 0;
                    }
                })
            })
            await this.client.db(this.DB_NAME).collection("guilds").updateOne(
                {guildId, status: true},
                {$set: updateObject},
                {upsert: true})
        }
        return response
    }
}