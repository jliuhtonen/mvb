const Mvb = require('./mvb')
const moment = require('moment')
const jgtDate = moment("2014-05-14")

const bot = new Mvb()

bot.onCommand('jgt', (args, reply) => {
  const [command] = args
  const timeUnit = getTimeUnit(command)
  const timeSinceJgt = moment().diff(jgtDate, timeUnit)
  reply(createReplyMessage(timeSinceJgt, timeUnit))
})

function getTimeUnit(command) {
  if (command === 'timestamp') {
    return 'millis'
  } else {
    return 'days'
  }
}

function createReplyMessage(amount, unit) {
  if(unit === 'millis') {
    return `JGT timestamp ${amount}`
  } else {
    return `${amount} päivää JGT`
  }
}

console.log("JGT bot 3000 starting!!!!!")
