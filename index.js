const telegram = require('./mvb')
const moment = require('moment')
const jgtDate = moment("2014-05-14")

telegram.onMessage('/jgt', (message, reply) => {
  const daysSinceJgt = moment().diff(jgtDate, 'days')
  const daysSinceJgtMsg = `${daysSinceJgt} päivää JGT`
  reply(daysSinceJgtMsg)
})

console.log("JGT bot 3000 starting!!!!!")
