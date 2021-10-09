const MongoHelper = require('./dofus/mongodb.js')
const EventEmitter = require('events');
const eventEmitter = new EventEmitter();
const db = new MongoHelper("dofus", eventEmitter)

// async function test() {
//     await db.connect()
//     console.log("test");
//     let response = await db.setGuild("797867064882364427", "!", true)
//     console.log(response);
//     //db.addGuild("797867064882364427").then(r => console.log(r))
//     process.exit(0)
//
// }
//
// test()
scoreDomains = [1,2,3]
let y = [for (x of scoreDomains) x]