const ZeroStep = require('../index.js')

const zs = new ZeroStep()

zs.register({
  name: 'hello-world',
  env: [
    {
      name: 'message',
      // optional attributes
      default: 'Hello, world!',
      valid: (value) => value === 'Hello, world!',
      showValue: true,
      hint: 'Please provide a message to display to the user'
    }
  ],
  init: (ctx) => console.log(ctx.env.message),
})

zs.init().then(() => zs.destroy())
