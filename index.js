const SlackBot = require('slackbots');
const Rx = require('rxjs');
const Winston = require('winston');

const logger = new (Winston.Logger)({
  transports: [
    new (Winston.transports.Console)(),
    new (Winston.transports.File)({filename: 'golem.log'})
  ]
});

if (!process.env.token) {
  logger.error('not specified token in environment');
  process.exit(1);
}

const bot = new SlackBot({
  token: process.env.token,
  name: 'golem'
});

class Golem {
  constructor () {
    logger.info('Golem is ready');

    //mention message regex
    const regex = /^<@([A-Z0-9]+)>:?\s*((\w+\s*)*)/g;

    const users$ = Rx.Observable.fromPromise(bot.getUsers());
    const message$ =
      Rx.Observable.combineLatest(
        users$,
        Rx.Observable.create((obs) => bot.on('message', (data) => obs.next(data)))
          .filter(({type}) => type === 'message')
      )
        .filter(([{members}, {text}]) => {
          const matches = new RegExp(regex).exec(text);
          if (matches === null) {
            return false;
          }

          return members.find(({id, is_bot}) => id === matches[1] && is_bot)
        })
        .map(([{members}, {text, channel, user}]) => {
          const task = new RegExp(regex).exec(text)[2].replace(/\s+/, ' '); //trim multiple spaces

          const command = task.split(' ').splice(1)[0]; // first word after mention of the bot is command
          const args = task.split(' ').splice(2); // second and next are Array<Args>

          return ({
            command,
            args,
            channel,
            user: members.find(({id}) => id === user)
          })
        })
        .subscribe(this.messageHandler);

  }


  messageHandler ({channel, command, args, user}) {
    let message;

    const postMessage = (message, emoji) => bot.postMessage(channel, message, emoji && {icon_emoji: `:${emoji}:`});
    const getArgument = (position, defaultValue = null) => args[position] ? args[position] : defaultValue;

    switch (command) {
      case 'lunchtime':
        postMessage('Lunchtime reponse!', getArgument(0, 'observable'))
    }


  }
}

bot.on('error', (e) => logger.error(!e ? 'Cannot connect to Slack. Do you have correct token?' : 'Exception: ', e));
bot.on('start', () => new Golem);