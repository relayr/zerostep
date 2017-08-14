'use strict'

const ZeroStep = require('../index')

const zs = new ZeroStep()

zs
  .register((() => {
    let secret = 'S3C43T'
    let obj = {
      destroy: () => console.log(`Destroying obj with secret:= ${secret}`),
    }

    return {
      name: 'Secret and initValue usage in destroy',
      init: () => obj,
      destroy: (ctx, obj) => obj.destroy(),
    }
  })())
  .register({
    name: 'Module which was added by chaining register calls!',
    init: () => console.log('Hello from chained module!'),
  })


zs.init().then(() => zs.destroy())