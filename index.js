'use strict'

const Rx = require('rxjs')
const Winston = require('winston')
const fetch = require('node-fetch')
const R = require('ramda')
const WebSocket = require('ws')
const EventEmitter = require('events')

const logger = new (Winston.Logger)({
  transports: [
    new (Winston.transports.Console)(),
    new (Winston.transports.File)({filename: 'golem.log'})
  ]
})

class Golem extends EventEmitter {

  constructor ({token, username} = {}) {
    super()

    if (!token || !username) {
      logger.error('Set proper options object. Token or Username missing.')
      return
    }

    this.token = token
    this.username = username;
    this.users = null // after successful connect will contain user object...
    this.channels = null // ...channels...
    this.groups = null // ...groups

    /* private variables */
    this._ws = null

    this._connect()
  }

  /* Private methods */

  _getArgumentFunction(args){
    return (index, defaultValue = null) => args[index] ? args[index] : defaultValue
  }

  _replyFunction (channel) {
    return (...args) => this.postMessage.apply(this, [channel, ...args])
  }

  _connect () {
    this.slackAPI('rtm.start')
      .then((payload) => {
        const {url} = payload

        Object.assign(this, R.pick(['self', 'users', 'channels', 'groups'], payload))
        this.bot = this.users.find(({id}) => id === this.self.id)
        this._ws = new WebSocket(url)
        this._init()
      })
      .catch((e) => logger.error('Connect:', e))
  }

  _init () {
    logger.info('Golem is ready')
    this.emit('init')
    // mention message regex
    const regex = /^<@([A-Z0-9]+)>:?\s*((\w+\s*)*)/g

    Rx.Observable.create((obs) => this._ws.on('message', (data) => obs.next(JSON.parse(data))))
      .filter(({type}) => type === 'message')
      .filter(({text}) => {
        const matches = new RegExp(regex).exec(text)
        return matches ? this.bot.id === matches[1] : false
      })
      .map(({text, channel, user}) => {
        const normalizedText = text.replace(/\s+/, ' ')
        const task = new RegExp(regex).exec(normalizedText)[2] // trim multiple spaces
        const commands = task.split(' ')

        const command = commands[0] // first word after mention of the bot is command
        const args = commands.slice(1) // strip first – all the rest are Array<Args>

        return ({
          command,
          args,
          channel,
          user: this.users.find(({id}) => id === user)
        })
      })
      .subscribe(({command, args, channel, user}) => {
        this.emit(command,
          this._replyFunction(channel),
          this._getArgumentFunction(args),
          user
        )
      })
  }

  /* Public methods */

  /**
   * This method provide you Slack Web API
   * @param endpoint {String}
   * @param params {Object}
   * @returns {Promise}
   */
  slackAPI (endpoint, params) {
    const processedParams = R.compose(
      R.join(''),
      R.intersperse('&'),
      R.map(R.join('=')),
      R.toPairs,
      R.assoc('token', this.token)
    )(params)

    return fetch(`https://slack.com/api/${endpoint}?${processedParams}`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json; charset=utf-8'}
    }).then(res => res.json())
      .then(payload => {
        const {ok} = payload

        if (!ok) throw new Error(payload.error)

        return payload
      })
  }

  /**
   * Post message into a channel.
   * If channel param is omitted the message will be posted to the channel who was the last in emitting.
   * @param channel {Number}
   * @param text {String}
   * @param params {Object} (via https://api.slack.com/methods/chat.postMessage)
   */
  postMessage (channel, text, params) {
    const {username} = this

    const processedParams = Object.assign({
      channel,
      text,
      username
    }, params)

    this.slackAPI('chat.postMessage', processedParams).catch((e) => logger.error('Post Message:', e))
  }
}

module.exports = Golem

