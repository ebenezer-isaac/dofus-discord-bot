function generateExampleCommands(prefix, command, scoreDomains) {

    const getRandomScore = () => {
        return Math.floor(Math.random() * 10) + 1
    }
    let exampleCommands = {
        "ping": ["ping"],
        "set": [],
        "remove": [],
        "profile": ["profile", "profile @member"],
        "top": ["top", `top ${getRandomScore()}`],
        "reset": ["reset"],
        "addmod": ["addmod @member"],
        "delmod": ["delmod @member"],
        "listmod": ["listmod"]
    }
    scoreDomains.forEach(scoreDomain => {
        exampleCommands[scoreDomain] = [`${scoreDomain} ${getRandomScore()} @member`]
        exampleCommands.set.push(`set ${scoreDomain} ${getRandomScore()} @member`)
        exampleCommands.remove.push(`remove ${scoreDomain} ${getRandomScore()} @member`)
        exampleCommands.top.push(`top ${scoreDomain} ${getRandomScore()}`)
    })
    const commands = exampleCommands[command]
    let text = `Example Command${commands.length > 1 ? "s" : ""} : \n`
    commands.forEach((example, index) => {
        text += `${index + 1}. ${prefix}${example}\n`
    })
    text += `\n`
    return text
}

function scoreDomainsErrorGenerator(prefix, command, scoreDomains) {
    return `There was an error with the score domain in your command\n${generateExampleCommands(prefix, command, scoreDomains)}Set command has to be followed by ${scoreDomains.join("/")}. None of them were found`
}

function scoreRangeErrorGenerator(prefix, command, scoreDomains) {
    return `There was an error with the score specified in your command\n${generateExampleCommands(prefix, command, scoreDomains)}Change in score should be between 1 and 100`
}

function insufficientArgumentsErrorGenerator(prefix, command, scoreDomains) {
    return `Sufficient arguments were not found in your command\n${generateExampleCommands(prefix, command, scoreDomains)}`
}

function toCamelCase(text) {
    return text
        .replace(/(?:^\w|[A-Z]|\b\w)/g, (ltr, idx) => idx === 0 ? ltr.toLowerCase() : ltr.toUpperCase())
        .replace(/\s+/g, '');
}

function titleCase(text) {
    console.log(typeof text, text)

    return text.replace(
        /\w\S*/g,
        function (txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        }
    );
}

function parseOperation(operation) {
    if (operation === "add") {
        return "increased by"
    } else if (operation === "del") {
        return "reduced by"
    } else if (operation === "set") {
        return "set to"
    }
}

function parseEntityIdentifier(entity) {
    console.log(entity)
    if (entity.type === 'user' || entity.type === 'bot') {
        return `<@!${entity.id}>`
    } else if (entity.type === 'role') {
        return `<@&${entity.id}>`
    } else {
        return entity.id
    }
}

function scoreUserList(scoreDomain, arr, limit) {
    let fields = [{name: `Top ${limit} ${titleCase(scoreDomain)} Scores `, value: '', inline: false}]
    let nameField = {name: `Player Name`, value: '', inline: true}
    let scoreField = {name: `Score`, value: '', inline: true}
    arr.for((user, index) => {
        nameField.value += `${index + 1}. ${parseEntityIdentifier(user)}\n`
        scoreField.value += `${user.score}\n`
    })
    fields.push(nameField, scoreField)
    return fields
}

function scoreRoleList(scoreDomain, arr, limit) {
    let fields = [{name: `Top ${limit} ${titleCase(scoreDomain)} Scores `, value: '', inline: false}]
    let nameField = {name: `Guild Name`, value: '', inline: true}
    let scoreField = {name: `Score`, value: '', inline: true}
    arr.for((user, index) => {
        nameField.value += `${index + 1}. ${parseEntityIdentifier(user)}\n`
        scoreField.value += `${user.score}\n`
    })
    fields.push(nameField, scoreField)
    return fields
}

function scoreChangeUserList(scoreDomain, arr, score, operation) {
    let field = {
        name: `${titleCase(scoreDomain)} Scores have been ${parseOperation(operation)} ${score} for the following users:`,
        value: '',
        inline: false
    }
    arr.forEach((user, index) => {
        field.value += `${index + 1}. ${parseEntityIdentifier(user)}\n`
    })
    return field
}

function scoreChangeRoleList(arr) {
    let field = {
        name: `Following roles were identified but they are not registered as Guild Roles:`,
        value: '',
        inline: false
    }
    arr.forEach((role, index) => {
        field.value += `${index + 1}. ${parseEntityIdentifier(role)}\n`
    })
    return field
}

function scoreChangeGuildRoleList(scoreDomain, arr, score, operation) {
    let field = {
        name: `${titleCase(scoreDomain)} Scores have been ${parseOperation(operation)} ${score} for the following roles:`,
        value: '',
        inline: false
    }
    arr.forEach((role, index) => {
        field.value += `${index + 1}. ${parseEntityIdentifier(role)}\n`
    })
    return field
}

function scoreChangeBotList(arr) {
    let field = {
        name: `Bots sadly don't own score profiles :`,
        value: '',
        inline: false
    }
    arr.forEach((user, index) => {
        field.value += `${index + 1}. ${parseEntityIdentifier(user)}\n`
    })
    return field
}


function scoreChangeNotFoundList(arr) {
    let field = {
        name: `Some mentions weren't identified in your command :`,
        value: '',
        inline: false
    }
    arr.forEach((user, index) => {
        field.value += `${index + 1}. ${parseEntityIdentifier(user)}\n`
    })
    return field
}

const zeroPad = (num, places) => String(num).padStart(places, '0')

module.exports = {
    generateExampleCommands,
    toCamelCase,
    titleCase,
    scoreDomainsErrorGenerator,
    scoreRangeErrorGenerator,
    insufficientArgumentsErrorGenerator,
    scoreChangeUserList,
    scoreChangeRoleList,
    scoreChangeBotList,
    scoreChangeNotFoundList,
    scoreChangeGuildRoleList,
    parseEntityIdentifier,
    zeroPad
}