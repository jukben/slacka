# Slacka
[![GitHub stars](https://img.shields.io/github/stars/jukben/slacka.svg)](https://github.com/jukben/slacka/stargazers) [![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://raw.githubusercontent.com/jukben/slacka/master/LICENSE.md) ![Dependencies](https://david-dm.org/jukben/slacka.svg)

[![Standard - JavaScript Style Guide](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)

## Install 📦
    npm install slacka

## API

### ```new Slacka(options)```
Create new instance of the bot. Options should have to be an object ```{ token, username }```

#### ```.on('command', callbackFunction)```
"Command" is a string (a name for an event) what you want a react to. **Slacka by default emmit '`init`' event after succefull start** Slack RTM communication via Websockets.
```callbackFunction(sentReply, getArgs, userObject)``` has three parameters
- ```sentReply(text: String, params: Object)``` function for sending reply, for params see see https://api.slack.com/methods/chat.postMessage
- ```getArguments(index: Number, defaultValue: Any)``` getter function for parameter at index `index` with default value `defaultValue`
- ```userObject``` which is [User type](https://api.slack.com/types/user) retrieved from Slack.

#### ```.postMessage(channel: ChannelID, text: String, params: Object)```
 - same as `setReply` with difference that first argument is channel ID.
 
#### ```.slackAPI(endpoint: String, params: Object): Promise``` 
 - see [Slack Web API](https://api.slack.com/methods) for more info .
 
#### ```.groups: Object, .users: Object, .channels: Object```
 - these variables are filled after `init` event with proper objects from Slack API


## Example 

_You can try by yourself:_ 

Run: ```TOKEN=YOURSECRETOKEN node sample.js```

and then could try to type this into the some channel (where is your bot invited): `@nickOfYourBot: hello`

```javascript
const Slacka = require('./index')

if (!process.env.token) {
  console.error('not specified token in environment')
  process.exit(1)
}

const slacka = new Slacka({
  token: process.env.token, // // Grab the token at https://my.slack.com/services/new/bot
  username: 'golem' // name of the bot
})

/**
 * The on event has name of command (in this case "hello")
 *
 * Next there are three arguments of the callback function:
 *
 * Function sentReply(text: String, params: Object) see https://api.slack.com/methods/chat.postMessage
 * Function getArguments(index: Number, defaultValue: Any)
 * Object UserObject see https://api.slack.com/types/user
 */

slacka.on('hello', (sentReply, getArg, {real_name}) => {
  sentReply(`Hi! ${real_name}!`, {
    icon_emoji: `:${getArg(0, 'pizza')}:`
  })
})
```
