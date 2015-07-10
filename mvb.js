const config = require('./config')
const Bacon = require('baconjs')
const request = require('superagent')
const R = require('ramda')

const longPollDurationSeconds = 60
const apiUrl = `https://api.telegram.org/bot${config.authToken}`
const updatesUrl = `${apiUrl}/getUpdates`
const sendMessageUrl = `${apiUrl}/sendMessage`

const sendMessage = (chatId, message) => {
  const text = encodeURIComponent(message)
  const url = `${sendMessageUrl}?chat_id=${chatId}&text=${text}`
  request.post(url).end()
}

const getUpdates = (sinceUpdateId, callback) => {
  const url = `${updatesUrl}?timeout=${longPollDurationSeconds}&offset=${sinceUpdateId}`
  request.get(url).end(callback)
}

const latestUpdateIds = new Bacon.Bus()
const lastUpdateId = latestUpdateIds.toProperty(0)

const updateResponses = lastUpdateId.flatMapLatest((lastUpdate) => Bacon.fromNodeCallback(getUpdates, lastUpdate + 1))

updateResponses.onError(console.error.bind(this))

const updates = updateResponses.map((res) => res.body)
const okUpdates = updates.filter((resp) => resp.ok)

const updateIdWithResponse = lastUpdateId.combine(okUpdates, (id, response) => {
  return {
    id: id,
    response: response
  }
})

const receivedLatestUpdateIds = updateIdWithResponse.map((responseData) => {
  const { id, response } = responseData

  if (response.result.length > 0) { 
    return R.last(response.result).update_id
  } else {
    return id
  }
})

latestUpdateIds.plug(receivedLatestUpdateIds)

const incomingResults = okUpdates
  .filter((update) => update.result && update.result.length > 0)
  .flatMapLatest((update) => Bacon.fromArray(update.result))

const incomingMessages = incomingResults.filter((result) => !!result.message)

module.exports = {
  onMessage: (value, f) => {
    return incomingMessages
      .filter((result) => result.message.text.trim() === value)
      .onValue((result) => {
        f(result.message.text, (replyMsg) => sendMessage(result.message.chat.id, replyMsg))
      })
    },
  sendMessage: sendMessage
}
