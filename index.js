const Golem = require('./golem')

if (!process.env.token) {
  console.error('not specified token in environment')
  process.exit(1)
}

const golem = new Golem({
  token: process.env.token,
  username: 'golem'
})

golem.on('lunchtime', (args) => console.log('args: ', args))
