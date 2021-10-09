const express = require("express")
const expressServer = express()
expressServer.all("/", (req, res) => {
    res.send("Bot is running!")
})

function keepAlive() {
    expressServer.listen(4000, () => {
        console.log("Server is ready!")
    })
}

module.exports = keepAlive
