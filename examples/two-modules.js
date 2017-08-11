const ZeroStep = require('../index.js')

const zs = new ZeroStep()

zs.register({
  name: 'one',
  export: 'symbolFromOne',
  init: () => {
    console.log('hello from 1')
    return 'Message from one'
  },
  destroy: () => console.log('goodbye from 1')
})

zs.register({
  name: 'two',
  imports: ['symbolFromOne'],
  init: (ctx) => {
    console.log('hello from 2')
    console.log(`got ${ctx.symbolFromOne}`)
  },
  destroy: () => console.log('goodbye from 2')
})

zs.init().then(() => zs.destroy())
