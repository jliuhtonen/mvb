const Mvb = require('./mvb')
const moment = require('moment')
const jgtDate = moment("2014-05-14")

const bot = new Mvb()

bot.onMessage('/jgt', (message, reply) => {
  const daysSinceJgt = moment().diff(jgtDate, 'days')
  const daysSinceJgtMsg = `${daysSinceJgt} päivää JGT`
  reply(daysSinceJgtMsg)
})

console.log("JGT bot 3000 starting!!!!!")
