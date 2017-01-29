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

  constructor ({token, username}) {
    super()

    if (!token || !username) {
      return logger.error('Set proper options object. Token or Username missing.')
    }

    this.token = token
    this.username = username
    this.ws = null

    this.users = null
    this.channels = null
    this.groups = null

    this.connect()
  }

  connect () {
    this.slackAPI('rtm.start')
      .then((payload) => {
        const {url} = payload

        Object.assign(this, R.pick(['self', 'users', 'channels', 'groups'], payload))
        this.bot = this.users.find(({id}) => id === this.self.id)
        this.ws = new WebSocket(url)
        this.init()
      })
      .catch((e) => logger.error('Connect:', e))
  }

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

  init () {
    logger.info('Golem is ready')
    this.emit('init')
    // mention message regex
    const regex = /^<@([A-Z0-9]+)>:?\s*((\w+\s*)*)/g

    Rx.Observable.create((obs) => this.ws.on('message', (data) => obs.next(JSON.parse(data))))
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
        const args = commands.splice(2) // second and next are Array<Args>
        return ({
          command,
          args,
          channel,
          user: this.users.find(({id}) => id === user)
        })
      })
      .subscribe(({command, args, channel, user}) => {
        this.emit(command, args, channel, user)
      })
  }

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
