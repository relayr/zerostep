const ZeroStep = require('../index.js')

const zs = new ZeroStep()

zs.register({
  name: 'hello-world',
  init: () => console.log('hello, world'),
  destroy: () => console.log('goodbye, world')
})

zs.init().then(() => zs.destroy())
