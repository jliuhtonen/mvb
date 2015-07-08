const config = require('./config')
const Bacon = require('baconjs')
const request = require('superagent')
const R = require('ramda')
const moment = require('moment')

const pollIntervalMs = 2000
const jgtDate = moment("2014-05-14")
const apiUrl = `https://api.telegram.org/bot${config.authToken}`
const updatesUrl = `${apiUrl}/getUpdates`
const sendMessageUrl = `${apiUrl}/sendMessage`
const lastUpdateId = new Bacon.Bus()

const lastUpdateProp = lastUpdateId.toProperty(0)

const updates = lastUpdateProp.sampledBy(Bacon.interval(pollIntervalMs))
  .flatMapLatest((lastUpdate) => Bacon.fromNodeCallback(getUpdates, lastUpdate + 1))
  .map((res) => res.body)

const okUpdates = updates.filter((resp) => resp.ok)
const receivedLatestUpdateIds = okUpdates.flatMapLatest((resp) => {
  if (resp.result.length > 0) { 
    return Bacon.once(R.last(resp.result).update_id)
  } else {
    return Bacon.never()
  }
})
lastUpdateId.plug(receivedLatestUpdateIds)

const incomingResults = okUpdates.filter((update) => update.result && update.result.length > 0).flatMapLatest((update) => Bacon.fromArray(update.result))

const incomingMessages = incomingResults.filter((result) => !!result.message)
const incomingJgtRequests = incomingMessages.filter((result) => result.message.text === '/jgt')

incomingJgtRequests.onValue((result) => {
  const daysSinceJgt = moment().diff(jgtDate, 'days')
  const message = `${daysSinceJgt} päivää JGT`
  sendMessage(result.message.chat.id, message)
})

const sendMessage = (chatId, message) => {
  const text = encodeURIComponent(message)
  const url = `${sendMessageUrl}?chat_id=${chatId}&text=${text}`
  request.post(url).end()
}

const getUpdates = (sinceUpdateId, callback) => {
  const url = `${updatesUrl}?offset=${sinceUpdateId}`
  request.get(url).end(callback)
}

console.log("JGT bot 3000 starting!!!!!")
