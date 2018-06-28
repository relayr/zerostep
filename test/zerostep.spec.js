'use strict'

const chai = require('chai')
const sinon = require('sinon')

const ZeroStep = require('../index')

const expect = chai.expect

const createDummyModule = () => {
  return {
    name: 'dummyModule',
    init: () => Promise.resolve(),
    destroy: () => Promise.resolve(),
  }
}

const createFaultyInitModule = () => {
  return {
    name: 'Faulty init',
    init: () => {
      throw new Error('I am faulty!')
    },
    destroy: () => Promise.reject('Should not be possible to call me!'),
  }
}

const createDefaultZeroStepConfig = (env = {}) => ({
  loggerCb: () => ({
    info: () => true,
    error: () => true,
  }),
  env: env,
})

describe('canary test', function() {
  it('should work', function(done) {
    expect(true).to.equal(true)
    done()
  })
})

describe('ZeroStep class', () => {
  let core = null

  beforeEach(() => {
    core = new ZeroStep(createDefaultZeroStepConfig())
  })

  afterEach(() => {
    core = null
  })

  it('should be able to be instantiated', () => {
    expect(core).to.exist
  })

  it('should have a register method', () => {
    expect(core.register).to.exist
  })

  it('should have an init method', () => {
    expect(core.init).to.exist
  })

  it('should have a destroy method', () => {
    expect(core.destroy).to.exist
  })
})

describe('ZeroStep interaction with modules', () => {
  it('should be possible to register a module with core', () => {
    const core = new ZeroStep(createDefaultZeroStepConfig())
    core.register(createDummyModule())
  })

  it('should be an error to register a module w/o a name', () => {
    const core = new ZeroStep(createDefaultZeroStepConfig())
    expect(core.register.bind(core, ({}))).to.throw()
  })

  it('should be an error to register a module w/o an init method', () => {
    const core = new ZeroStep(createDefaultZeroStepConfig())
    expect(core.register.bind(core, ({name: 'module w/o init'}))).to.throw()
  })

  it('should be an error to register a module with a destroy attribute which is not a function', () => {
    const core = new ZeroStep(createDefaultZeroStepConfig())
    expect(core.register.bind(core, ({name: 'module with non function destroy', init: () => true, destroy: true}))).to.throw()
  })


  it('should call init on a registered module when core.init() is called', () => {
    const core = new ZeroStep(createDefaultZeroStepConfig())
    const dummyModule = createDummyModule()
    const stub = sinon.stub(dummyModule, 'init')
    stub.resolves()

    core.register(dummyModule)
    return core.init().then(() => {
      return expect(stub.calledOnce).to.be.true
    })
  })

  it('should call init on two registered modules when core.init() is called', () => {
    const core = new ZeroStep(createDefaultZeroStepConfig())
    const dummyModule1 = createDummyModule()
    const dummyModule2 = createDummyModule()
    const init1 = sinon.stub(dummyModule1, 'init')
    init1.resolves()
    const init2 = sinon.stub(dummyModule2, 'init')
    init2.resolves()


    core.register(dummyModule1)
    core.register(dummyModule2)

    return core.init().then(() => {
      expect(init1.calledOnce).to.be.true
      expect(init2.calledOnce).to.be.true
      expect(init1.calledBefore(init2)).to.be.true
    })
  })

  it('should call init on two registered modules when core.init() is called', () => {
    const core = new ZeroStep(createDefaultZeroStepConfig())
    const dummyModule1 = createDummyModule()
    const dummyModule2 = createDummyModule()
    const dummyModule3 = createDummyModule()

    const init1 = sinon.stub(dummyModule1, 'init')
    init1.resolves()
    const init2 = sinon.stub(dummyModule2, 'init')
    init2.resolves()
    const init3 = sinon.stub(dummyModule3, 'init')
    init3.resolves()


    core.register(dummyModule1)
    core.register(dummyModule2)
    core.register(dummyModule3)

    return core.init().then(() => {
      expect(init1.calledOnce).to.be.true
      expect(init2.calledOnce).to.be.true
      expect(init3.calledOnce).to.be.true
      expect(init1.calledBefore(init2)).to.be.true
    })
  })

  it('should call destroy on a registered module when core.destroy() is called', () => {
    const core = new ZeroStep(createDefaultZeroStepConfig())
    const dummyModule = createDummyModule()
    const stub = sinon.stub(dummyModule, 'destroy')
    stub.resolves()

    core.register(dummyModule)
    return core.init()
      .then(() => core.destroy())
      .then(() => {
        return expect(stub.calledOnce).to.be.true
      }
    )
  })

  it('should provide the return value of init as the second argument to destroy', () => {
    const core = new ZeroStep(createDefaultZeroStepConfig())
    const knownObject = {
      key: 'TestValue123',
    }
    const module = {
      name: 'Test initValue',
      init: () => knownObject,
      destroy: (ctx, initValue) => {
        return expect(initValue).to.deep.equal(knownObject)
      },
    }

    core.register(module)
    return core.init()
      .then(() => core.destroy())
  })

  it('should provide the return value of init as the second argument to destroy for two different modules', () => {
    const core = new ZeroStep(createDefaultZeroStepConfig())
    const knownObject1 = {
      key: 'TestValue123',
    }
    const module1 = {
      name: 'Test initValue 1',
      init: () => knownObject1,
      destroy: (ctx, initValue) => {
        return expect(initValue).to.deep.equal(knownObject1)
      },
    }

    const knownObject2 = {
      key: 'TestValue321',
    }
    const module2 = {
      name: 'Test initValue',
      init: () => knownObject2,
      destroy: (ctx, initValue) => {
        return expect(initValue).to.deep.equal(knownObject2)
      },
    }


    core
      .register(module1)
      .register(module2)
    return core.init()
      .then(() => core.destroy())
  })


  it('should call destroy on two registered modules when core.destroy() is called', () => {
    const core = new ZeroStep(createDefaultZeroStepConfig())
    const dummyModule1 = createDummyModule()
    const dummyModule2 = createDummyModule()

    const stub1 = sinon.stub(dummyModule1, 'destroy')
    stub1.resolves()

    const stub2 = sinon.stub(dummyModule2, 'destroy')
    stub2.resolves()

    core.register(dummyModule1)
    core.register(dummyModule2)

    return core.init()
      .then(() => core.destroy())
      .then(() => {
        // Test for reverse order in destroy
        expect(stub1.calledBefore(stub2)).to.be.false
        expect(stub1.calledOnce).to.be.true
        expect(stub2.calledOnce).to.be.true
      }
    )
  })

  it('should call destroy on three registered modules when core.destroy() is called', () => {
    const core = new ZeroStep(createDefaultZeroStepConfig())
    const dummyModule1 = createDummyModule()
    const dummyModule2 = createDummyModule()
    const dummyModule3 = createDummyModule()

    const stub1 = sinon.stub(dummyModule1, 'destroy')
    stub1.resolves()

    const stub2 = sinon.stub(dummyModule2, 'destroy')
    stub2.resolves()

    const stub3 = sinon.stub(dummyModule3, 'destroy')
    stub3.resolves()

    core.register(dummyModule1)
    core.register(dummyModule2)
    core.register(dummyModule3)

    return core.init()
      .then(() => core.destroy())
      .then(() => {
        // Test for reverse order in destroy
        expect(stub1.calledBefore(stub2)).to.be.false

        expect(stub1.calledOnce).to.be.true
        expect(stub2.calledOnce).to.be.true
        expect(stub3.calledOnce).to.be.true
      }
    )
  })


  it('should call destroy on a registered module when core.init() encounters a module which throws an error during initialization', () => {
    const core = new ZeroStep(createDefaultZeroStepConfig())
    const dummyModule = createDummyModule()
    const faultyInitModule = createFaultyInitModule()

    const dummyInit = sinon.stub(dummyModule, 'init')
    dummyInit.resolves()
    const dummyDestroy = sinon.stub(dummyModule, 'destroy')
    dummyDestroy.resolves()

    const faultyInit = sinon.stub(faultyInitModule, 'init')
    faultyInit.rejects(new Error('Faulty was here!'))
    const faultyDestroy = sinon.stub(faultyInitModule, 'destroy')
    faultyDestroy.resolves()


    core.register(dummyModule)
    core.register(faultyInitModule)

    return core.init()
      .catch((err) => true)
      .then(() => {
        expect(dummyInit.calledOnce).to.be.true
        expect(dummyDestroy.calledOnce).to.be.true
        expect(faultyInit.calledOnce).to.be.true
        expect(faultyDestroy.calledOnce).to.be.false
      }
    )
  })

  it('should be possible to import a service from module1 in module2', () => {
    const core = new ZeroStep(createDefaultZeroStepConfig())
    const module1 = Object.assign(createDummyModule(), {export: 'module1-service', init: () => 'ice cream'})
    const module2 = Object.assign(createDummyModule(), {
      imports: ['module1-service'],
      init: (ctx) => expect(ctx['module1-service']).to.equal('ice cream')}
    )

    core.register(module1)
    core.register(module2)

    return core.init()
  })

  it('should fail if a module breaks the contract and does not export something', () => {
    const core = new ZeroStep(createDefaultZeroStepConfig())
    const module1 = Object.assign(createDummyModule(), {export: 'module1-service', init: () => Promise.resolve()})

    core.register(module1)

    return core.init()
      .then(() => {
        throw new Error('Should never be here!')
      })
      .catch((err) => {
        expect(err.message).to.equal('Module dummyModule broke contract and did not export service module1-service')
      })
  })

  it('should fail if a module requires an env value which was not provided', () => {
    const core = new ZeroStep(createDefaultZeroStepConfig())
    const module1 = Object.assign(createDummyModule(), {env: [{name: 'variable'}], init: () => Promise.resolve()})

    core.register(module1)

    return core.init()
      .then(() => {
        throw new Error('Should never be here!')
      })
      .catch((err) => {
        expect(err.message).to.equal('Module dummyModule needs environment variable <variable>')
      })
  })

  it('should fail with a hint if a module requires an env value which was not provided', () => {
    const core = new ZeroStep(createDefaultZeroStepConfig())
    const module1 = Object.assign(createDummyModule(),
      {env: [{name: 'variable', hint: 'Your bank account please'}],
      init: () => Promise.resolve()}
    )

    core.register(module1)

    return core.init()
      .then(() => {
        throw new Error('Should never be here!')
      })
      .catch((err) => {
        expect(err.message).to.equal('Module dummyModule needs environment variable <variable>: Your bank account please')
      })
  })

  it('should use a default value if provided and the variable was not provided', () => {
    const core = new ZeroStep(createDefaultZeroStepConfig())
    const module1 = Object.assign(createDummyModule(),
      {env: [{name: 'variable', default: 'testtesttest'}],
      init: (ctx) => {
        expect(ctx.env.variable).to.equal('testtesttest')
      }})

    core.register(module1)

    return core.init()
  })

  it('should use a provided value over the default', () => {
    const core = new ZeroStep(createDefaultZeroStepConfig({variable: 'provided variable'}))
    const module1 = Object.assign(createDummyModule(),
      {env: [{name: 'variable', default: 'testtesttest'}],
      init: (ctx) => {
        expect(ctx.env.variable).to.equal('provided variable')
      }})

    core.register(module1)

    return core.init()
  })

  it('should use a provided value over the default and a default where non was provided', () => {
    const core = new ZeroStep(createDefaultZeroStepConfig({variable: 'provided variable'}))
    const module1 = Object.assign(createDummyModule(),
      {env: [{name: 'variable', default: 'testtesttest'}, {name: 'varWithDefault', default: 'defaultValue'}],
      init: (ctx) => {
        expect(ctx.env.variable).to.equal('provided variable')
        expect(ctx.env.varWithDefault).to.equal('defaultValue')
      }})

    core.register(module1)

    return core.init()
  })

  it('should fail if a module provides a valid predicate for an env variable which returns false', () => {
    const core = new ZeroStep(createDefaultZeroStepConfig())
    const module1 = Object.assign(createDummyModule(),
      {env: [{name: 'variable', default: 'value', valid: () => false}],
      init: () => Promise.resolve()}
    )

    core.register(module1)

    return core.init()
      .then(() => {
        throw new Error('Should never be here!')
      })
      .catch((err) => {
        expect(err.message).to.equal('Module dummyModule has variable <variable> which was rejected by \'valid\' predicate')
      })
  })

  it('should fail if a module provides a non function valid predicate', () => {
    const core = new ZeroStep(createDefaultZeroStepConfig())
    const module1 = Object.assign(createDummyModule(),
      {env: [{name: 'variable', default: 'value', valid: 'no function'}],
      init: () => Promise.resolve()}
    )

    const msg = 'Refusing to register module dummyModule which has an env declaration with a non function valid attribute'
    expect(() => core.register(module1)).to.throw(msg)
  })

  it('should fail if a module provides an env w/o name', () => {
    const core = new ZeroStep(createDefaultZeroStepConfig())
    const module1 = Object.assign(createDummyModule(),
      {env: [{}],
      init: () => Promise.resolve()}
    )

    const msg = 'Refusing to register module dummyModule which has an env declaration w/o a string name attribute'
    expect(() => core.register(module1)).to.throw(msg)
  })

  it('should fail if a module provides an env with a non string hint', () => {
    const core = new ZeroStep(createDefaultZeroStepConfig())
    const module1 = Object.assign(createDummyModule(),
      {env: [{name: 'var', hint: 555}],
      init: () => Promise.resolve()}
    )

    const msg = 'Refusing to register module dummyModule which has an env declaration with a non string hint attribute'
    expect(() => core.register(module1)).to.throw(msg)
  })

  it('should fail if a module provides an env with a non string or number default', () => {
    const core = new ZeroStep(createDefaultZeroStepConfig())
    const module1 = Object.assign(createDummyModule(),
      {env: [{name: 'var', default: {}}],
      init: () => Promise.resolve()}
    )

    const msg = 'Refusing to register module dummyModule which has an env declaration with a non string/number default attribute'
    expect(() => core.register(module1)).to.throw(msg)
  })

  it('should fail if a module provides an env with a non boolean showValue attribute', () => {
    const core = new ZeroStep(createDefaultZeroStepConfig())
    const module1 = Object.assign(createDummyModule(),
      {env: [{name: 'var', showValue: 'hello'}],
      init: () => Promise.resolve()}
    )

    const msg = 'Refusing to register module dummyModule which has an env declaration with a non boolean showValue attribute'
    expect(() => core.register(module1)).to.throw(msg)
  })

  it('should call the valid method with the actual env value on registering a module', () => {
    const core = new ZeroStep(createDefaultZeroStepConfig())
    const module1 = Object.assign(createDummyModule(),
      {env: [{name: 'var', default: 'myDefaultValue', valid: (val) => expect(val).to.equal('myDefaultValue')}],
      init: () => Promise.resolve()}
    )

    return core.register(module1).init()
  })
})


