const MongoHelper = require('./mongodb.js')
const db = new MongoHelper()

async function test() {
    await db.connect()
    let response = await db.getGuildPrefixes();
    console.log("test",response);
    //db.addGuild("797867064882364427").then(r => console.log(r))
    process.exit(0)

}

test()
