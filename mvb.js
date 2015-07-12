import * as config from './config'
import * as Bacon from 'baconjs'
import * as request from 'superagent'

const longPollDurationSeconds = 60
const apiUrl = `https://api.telegram.org/bot${config.authToken}`
const updatesUrl = `${apiUrl}/getUpdates`
const sendMessageUrl = `${apiUrl}/sendMessage`

function sendMessage(chatId, message) {
  const text = encodeURIComponent(message)
  const url = `${sendMessageUrl}?chat_id=${chatId}&text=${text}`
  request.post(url).end()
}

function getUpdates(sinceUpdateId, callback) {
  const url = `${updatesUrl}?timeout=${longPollDurationSeconds}&offset=${sinceUpdateId}`
  request.get(url).end(callback)
}

function Mvb() {

  const latestUpdateIds = new Bacon.Bus()
  const lastUpdateId = latestUpdateIds.toProperty(0)

  const updateResponses = lastUpdateId.flatMapLatest((lastUpdate) => Bacon.fromNodeCallback(getUpdates, lastUpdate))

  updateResponses.onError(console.error.bind(this))

  const updates = updateResponses.map((res) => res.body)
  const okUpdates = updates.filter((resp) => resp.ok)

  const updateIdWithResponse = lastUpdateId.combine(okUpdates, (id, response) => {
    return {
      id: id,
      response: response
    }
  }).changes()

  const receivedLatestUpdateIds = updateIdWithResponse.map((responseData) => {
    const { id, response } = responseData
    const resultCount = response.result.length

    if (resultCount > 0) { 
      return response.result[resultCount - 1].update_id + 1
    } else {
      return id
    }
  })

  const currentUpdateIdOnError = updateResponses.errors().mapError(lastUpdateId)
  const nextUpdateIdOnResponse = receivedLatestUpdateIds.merge(currentUpdateIdOnError)
  latestUpdateIds.plug(nextUpdateIdOnResponse)

  const incomingResults = okUpdates
    .filter((update) => update.result && update.result.length > 0)
    .flatMapLatest((update) => Bacon.fromArray(update.result))

  const incomingMessages = incomingResults.filter((result) => !!result.message)

  function onMessage(value, handler) {
    return incomingMessages
      .filter((result) => result.message.text.trim() === value)
      .onValue((result) => {
	const replyFunction = (replyMsg) => sendMessage(result.message.chat.id, replyMsg)
	handler(result.message.text, replyFunction) 
      })
  }

  return {
    onMessage: onMessage,
    sendMessage: sendMessage
  }

}

module.exports = Mvb
