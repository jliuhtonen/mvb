import Bacon from 'baconjs'
import request from 'superagent'
import R from 'ramda'

const longPollDurationSeconds = 60
const errorRetryMillis = 10000

export default function(authToken) {

  const apiUrl = `https://api.telegram.org/bot${authToken}`
  const updatesUrl = `${apiUrl}/getUpdates`
  const sendMessageUrl = `${apiUrl}/sendMessage`

  const latestUpdateIds = new Bacon.Bus()
  const lastUpdateId = latestUpdateIds.toProperty(0)

  const updateResponses = lastUpdateId.flatMapLatest(lastUpdate => Bacon.fromNodeCallback(getUpdates, lastUpdate))

  updateResponses.onError(response => {
    const error = response.error
    if (error) {
      console.error(`Got error ${error.status} when calling ${error.method} ${error.path}`)
    } else {
      console.error(response)
    }
  })

  const updates = updateResponses.map(res => res.body)
  const okUpdates = updates.filter(resp => resp.ok)

  const updateIdWithResponse = lastUpdateId.combine(okUpdates, (id, response) => {
    return {
      id: id,
      response: response
    }
  }).changes()

  const receivedLatestUpdateIds = updateIdWithResponse.map(responseData => {
    const { id, response } = responseData
    const resultCount = response.result.length

    if (resultCount > 0) { 
      return R.last(response.result).update_id + 1
    } else {
      return id
    }
  })

  const currentUpdateIdOnError = lastUpdateId.sampledBy(updateResponses.errors().mapError(true)).throttle(errorRetryMillis)
  const nextUpdateIdOnResponse = receivedLatestUpdateIds.merge(currentUpdateIdOnError)
  latestUpdateIds.plug(nextUpdateIdOnResponse)

  const incomingResults = okUpdates
    .filter(update => update.result && update.result.length > 0)
    .flatMapLatest(update => Bacon.fromArray(update.result))

  const incomingMessages = incomingResults.filter(result => !!result.message)

  function onCommand(command, handler) {
    return incomingMessages
      .filter(result => {
        const msgText = result.message.text
	return msgText && msgText.startsWith(`/${command}`)
      })
      .map(result => {
	return {
	  chatId: result.message.chat.id,
	  args: R.tail(result.message.text.split(/\s+/))
	}
      })
      .onValue(data => {
	const replyFunction = replyMsg => sendMessage(data.chatId, replyMsg)
	handler(data.args, replyFunction) 
      })
  }

  function sendMessage(chatId, message) {
    const text = encodeURIComponent(message)
    const url = `${sendMessageUrl}?chat_id=${chatId}&text=${text}`
    request.post(url).end()
  }

  function getUpdates(sinceUpdateId, callback) {
    const url = `${updatesUrl}?timeout=${longPollDurationSeconds}&offset=${sinceUpdateId}`
    request.get(url).end(callback)
  }

  return Object.freeze({
    onCommand: onCommand,
    sendMessage: sendMessage
  })

}
