"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = _default;

var _baconjs = _interopRequireDefault(require("baconjs"));

var _superagent = _interopRequireDefault(require("superagent"));

var _ramda = _interopRequireDefault(require("ramda"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var longPollDurationSeconds = 60;
var errorRetryMillis = 10000;

function _default(authToken) {
  var apiUrl = "https://api.telegram.org/bot".concat(authToken);
  var updatesUrl = "".concat(apiUrl, "/getUpdates");
  var sendMessageUrl = "".concat(apiUrl, "/sendMessage");
  var latestUpdateIds = new _baconjs.default.Bus();
  var lastUpdateId = latestUpdateIds.toProperty(0);
  var updateResponses = lastUpdateId.flatMapLatest(function (lastUpdate) {
    return _baconjs.default.fromNodeCallback(getUpdates, lastUpdate);
  });
  updateResponses.onError(function (response) {
    var error = response.error;

    if (error) {
      console.error("Got error ".concat(error.status, " when calling ").concat(error.method, " ").concat(error.path));
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
    var id = responseData.id,
        response = responseData.response;
    var resultCount = response.result.length;

    if (resultCount > 0) {
      return _ramda.default.last(response.result).update_id + 1;
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
    return _baconjs.default.fromArray(update.result);
  });
  var incomingMessages = incomingResults.filter(function (result) {
    return !!result.message;
  });

  function onCommand(command, handler) {
    return incomingMessages.filter(function (result) {
      var msgText = result.message.text;
      return msgText && msgText.startsWith("/".concat(command));
    }).map(function (result) {
      return {
        chatId: result.message.chat.id,
        args: _ramda.default.tail(result.message.text.split(/\s+/))
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
    var url = "".concat(sendMessageUrl, "?chat_id=").concat(chatId, "&text=").concat(text);

    _superagent.default.post(url).end();
  }

  function getUpdates(sinceUpdateId, callback) {
    var url = "".concat(updatesUrl, "?timeout=").concat(longPollDurationSeconds, "&offset=").concat(sinceUpdateId);

    _superagent.default.get(url).end(callback);
  }

  return Object.freeze({
    onCommand: onCommand,
    sendMessage: sendMessage
  });
}