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
 * Next there are three argument of callback function:
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
