'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _baconjs = require('baconjs');

var _baconjs2 = _interopRequireDefault(_baconjs);

var _superagent = require('superagent');

var _superagent2 = _interopRequireDefault(_superagent);

var _ramda = require('ramda');

var _ramda2 = _interopRequireDefault(_ramda);

var longPollDurationSeconds = 60;
var errorRetryMillis = 10000;

exports['default'] = function (authToken) {

  var apiUrl = 'https://api.telegram.org/bot' + authToken;
  var updatesUrl = apiUrl + '/getUpdates';
  var sendMessageUrl = apiUrl + '/sendMessage';

  var latestUpdateIds = new _baconjs2['default'].Bus();
  var lastUpdateId = latestUpdateIds.toProperty(0);

  var updateResponses = lastUpdateId.flatMapLatest(function (lastUpdate) {
    return _baconjs2['default'].fromNodeCallback(getUpdates, lastUpdate);
  });

  updateResponses.onError(function (response) {
    var error = response.error;
    if (error) {
      console.error('Got error ' + error.status + ' when calling ' + error.method + ' ' + error.path);
    } else {
      console.error(response);
    }
  });

  var updates = updateResponses.map(function (res) {
    return res.body;
  });
  var okUpdates = updates.filter(function (resp) {
    return resp.ok;
  });

  var updateIdWithResponse = lastUpdateId.combine(okUpdates, function (id, response) {
    return {
      id: id,
      response: response
    };
  }).changes();

  var receivedLatestUpdateIds = updateIdWithResponse.map(function (responseData) {
    var id = responseData.id;
    var response = responseData.response;

    var resultCount = response.result.length;

    if (resultCount > 0) {
      return _ramda2['default'].last(response.result).update_id + 1;
    } else {
      return id;
    }
  });

  var currentUpdateIdOnError = lastUpdateId.sampledBy(updateResponses.errors().mapError(true)).throttle(errorRetryMillis);
  var nextUpdateIdOnResponse = receivedLatestUpdateIds.merge(currentUpdateIdOnError);
  latestUpdateIds.plug(nextUpdateIdOnResponse);

  var incomingResults = okUpdates.filter(function (update) {
    return update.result && update.result.length > 0;
  }).flatMapLatest(function (update) {
    return _baconjs2['default'].fromArray(update.result);
  });

  var incomingMessages = incomingResults.filter(function (result) {
    return !!result.message;
  });

  function onCommand(command, handler) {
    return incomingMessages.filter(function (result) {
      var msgText = result.message.text;
      return msgText && msgText.startsWith('/' + command);
    }).map(function (result) {
      return {
        chatId: result.message.chat.id,
        args: _ramda2['default'].tail(result.message.text.split(/\s+/))
      };
    }).onValue(function (data) {
      var replyFunction = function replyFunction(replyMsg) {
        return sendMessage(data.chatId, replyMsg);
      };
      handler(data.args, replyFunction);
    });
  }

  function sendMessage(chatId, message) {
    var text = encodeURIComponent(message);
    var url = sendMessageUrl + '?chat_id=' + chatId + '&text=' + text;
    _superagent2['default'].post(url).end();
  }

  function getUpdates(sinceUpdateId, callback) {
    var url = updatesUrl + '?timeout=' + longPollDurationSeconds + '&offset=' + sinceUpdateId;
    _superagent2['default'].get(url).end(callback);
  }

  return Object.freeze({
    onCommand: onCommand,
    sendMessage: sendMessage
  });
};

module.exports = exports['default'];