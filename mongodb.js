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
        let guild
        if (status === 0) {
            guild = {
                guildId,
                prefix
            }
        } else {
            guild = {
                guildId,
                prefix,
                status
            }
        }
        await this.client.db(this.DB_NAME).collection("guilds").updateOne(
            {guildId},
            {$set: guild},
            {upsert: true}
        );
        this.eventEmitter.emit('prefixUpdate');
        return true;
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

    async getAllUsers() {
        const result = await this.client.db(this.DB_NAME).collection("users").find()
        const results = await result.toArray();
        return JSON.stringify(results);
    }

    async getUser(email) {
        const result = await this.client.db(this.DB_NAME).collection("users").findOne({email})
        return JSON.stringify(result);
    }

    async getAllDevices(email) {
        const result = await this.client.db(this.DB_NAME).collection("devices").find().filter({email})
        const results = await result.toArray();
        return JSON.stringify(results);
    }

    async getDevice(deviceId) {
        const result = await this.client.db(this.DB_NAME).collection("devices").findOne({deviceId})
        return JSON.stringify(result);
    }


    async addDevice(email, deviceId, deviceName) {
        const device = {
            email,
            deviceId,
            deviceName,
            relayStatus: {0: false, 1: false, 2: false, 3: false}
        }
        const result = await this.client.db(this.DB_NAME).collection("devices").insertOne(device)
        return result.insertedId.toString();
    }


    async updateRelayStatus(email, deviceId, relayIndex, relayStatus) {
        const key = `relayStatus.${relayIndex}`
        const result = await this.client.db(this.DB_NAME).collection("devices").updateOne(
            {email, deviceId}, {$set: {[key]: (relayStatus === 'true')}})
        console.log(result);
        return JSON.stringify(result)

    }

    async login(email, password) {
        const result = await this.client.db(this.DB_NAME).collection("users").findOne({email})
        const response = {result: result ? await bcryptjs.compare(password, result.password) : false}
        if (response.result === true) {
            response.email = result.email
        }
        return JSON.stringify(response)
    }

    async signup(email, password) {
        const user = {email, password}
        user.password = await bcryptjs.hash(password, 12)
        const result = await this.client.db(this.DB_NAME).collection("users").insertOne(user)
        let response
        if (result.acknowledged) {
            response = {result: true, email}
        } else {
            response = {result: false}
        }
        return JSON.stringify(response)
    }
}