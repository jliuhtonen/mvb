# Minimum Viable Bot

Small library for implementing Telegram bots

## Usage

Register a bot and obtain an authentication token with Telegram, see [introduction to bots](https://core.telegram.org/bots).

Create a Mvb instance with your token:

```javascript
import Mvb from 'mvb'

const helloBot = new Mvb("myAuthToken")
```

Create a command handler with `onCommand`: 

```javascript
const unsubscribeFn = helloBot.onCommand('hello', (args, replyFn) => {
  const [name] = args
  replyFn(`Hello, ${name}!`)
}
```

`onCommand` takes two parameters. The command name without leading slash and an "event handler" function that will be called when the command is invoked. The event handler gets two parameters as well:

* _args_: an array of arguments passed to the command
* _replyFn_: a function that takes a string that you can use to send a reply message

It will return a function that you can use to unsubscribe from the command events.

Registering a command handler with `onCommand` returns a function that you can use to unsubscribe from the commands of this type.

So now, saying `/hello Telegram` in a group chat that the bot is a member of (or in a private conversation) will result in the bot responding `Hello, Telegram!`.

## Development

### Setting up

Install Babel
```npm install -g babel```

Install dependencies
```npm install```

### Compiling

```npm run compile```
