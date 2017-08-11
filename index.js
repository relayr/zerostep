'use strict'

/**
 * ZeroStep manages modules lifecycle
 */
class ZeroStep {
  /**
   * construct class
   * @param {*} config Configuration for ZeroStep
   */
  constructor(config) {
    const defaults = {
      name: 'ZeroStep',
      loggerCb: (name) => ({
        info: (msg) => console.log(`${name}:- ${msg}`),
        error: (msg) => console.error(`${name}:- ${msg}`),
      }),
    }

    this._config = Object.assign(defaults, config)

    this.name = this._config.name
    this._logger = this._config.loggerCb(this._config.name)

    this._modules = []

    // Keep track of our services
    this._services = new Map()
    // Keep track of services which have been registered
    this._registeredServices = new Map()
    // TODO: How to prevent client to ask for destroy before init has settled?!?
    this._initPromise = null
    this._destroyPromise = null
  }

  /**
   * Register a module
   * modules will be initialized in the order in which they where registered, so order matters
   * ZeroStep creates a shallow copy of originalModule
   * @param {*} originalModule
   */
  register(originalModule) {
    const module = Object.assign({}, originalModule)
    // Basic sanity checks for modules order matters!
    if (!module.hasOwnProperty('name')) {
      throw new Error('Refusing to register module w/o name attribute')
    }

    if (!module.hasOwnProperty('init') && !(typeof module.init === 'function')) {
      throw new Error(`Refusing to register module ${module.name} w/o init method`)
    }

    if (module.hasOwnProperty('destroy') && !(typeof module.destroy === 'function')) {
      throw new Error(`Refusing to register module ${module.name} with non function as destroy attribute`)
    }

    if (module.hasOwnProperty('export') && !(typeof module.export === 'string')) {
      throw new Error(`Refusing to register module ${module.name} which has a non string type export attribute`)
    }

    if (module.export) {
      if (this._registeredServices.has(module.export)) {
        throw new Error(
          `Refusing to register service ${module.export} from module ${module.name} ` +
          `but module ${this._registeredServices.get(module.export).name} registered it already`
        )
      } else {
        this._registeredServices.set(module.export, module)
      }
    }

    if (module.hasOwnProperty('imports') && !(Array.isArray(module.imports) && module.imports.every((imp) => typeof imp === 'string'))) {
      throw new Error(`Refusing to register module ${module.name} which has a an imports attribute which is not a list of only strings`)
    }

    if (module.imports) {
      const missingServices = module.imports.filter((imp) => !this._registeredServices.has(imp))
      if (missingServices.length > 0) {
        throw new Error(`Refusing to register module ${module.name} which wants to import missing services [${missingServices.join(', ')}]`)
      }
    }

    this._modules.push(module)
  }

  /**
   * Initialize registered modules in the order they where registered
   * @return {Promise}
   */
  init() {
    if (!this._initPromise) {
      /* The following algorithm builds a promise chain recursively with all registered modules.
       * Every module get's a context (ctx) with a logger and all imports.
       * The tricky part is to gracefully handle exceptions.
       * If you have modules a,b and c in that order and b throws an exception the exception should
       * be reportet and a.destroy() must be called (because it already has been successfully initialized)
       */
      const buildInitChain = (promise, modules, undoList, moduleNames) => {
        if (modules.length === 0) {
          return promise.catch((err) => {
            this._logger.error(`Could not initialize module ${moduleNames[undoList.length]}: ${err.message}, ${err.stack}`)
            this._logger.error('Attempting to shutdown already initalized modules gracefully!')
            this._shutDownModules(undoList.reverse())
            throw err
          })
        } else {
          const module = modules.shift()
          moduleNames.push(module.name)
          promise = promise.then(() => {
            const ctx = this._buildContextForModule(module)
            const imports = module.imports ? module.imports.join(', ') : ''
            const exports = module.export !== undefined ? module.export : ''
            this._logger.info(`Initializing module ${module.name}(${imports}) -> [${exports}]`)
            return module.init(ctx)
          })
          .then((ex) => {
            if (module.export) {
              if (ex !== undefined && ex != null) {
                this._services.set(module.export, ex)
              } else {
                throw new Error(`Module ${module.name} broke contract and did not export service ${module.export}`)
              }
            }
          })
          .then(() => undoList.push(module))
          return buildInitChain(promise, modules, undoList, moduleNames)
        }
      }

      this._initPromise = buildInitChain(Promise.resolve(), this._modules.slice(), [], [])
    }
    return this._initPromise
  }

  /**
   * Register global handlers for SIGINT, SIGTERM, SIGUSR2 to shut down this container and exit
   * the process and call 'init' afterwards
   * @return {Promise} @see init
   */
  initAsApplicationCore() {
    this._logger.info('Registering global signal handlers (SIGINT, SIGTERM, SIGUSR2)')

    // Handle Ctrl-C ...
    process.on('SIGINT', () => {
      this._logger.info('Received SIGINT...')
      this.destroy().catch((err) => this._logger.error(err)).then(() => process.exit(0))
    })

    process.on('SIGTERM', () => {
      this._logger.info('Received SIGTERM...')
      this.destroy().catch((err) => this._logger.error(err)).then(() => process.exit(0))
    })

    // Take care of nodemon restart notification
    // Nodemon expects us to send SIGUSR2 again once we handled our cleanup
    // Do not exit - else nodemon won't restart the server w/o changes
    process.once('SIGUSR2', () => {
      this._logger.info('RECEIVED SIGUSR2...')
      this.destroy().catch((err) => this._logger.error(err)).then(() => process.kill(process.pid, 'SIGUSR2'))
    })
    return this.init()
  }

  /**
   * Destroy modules in the reversed order of their registration
   * @return {Promise}
   */
  destroy() {
    return this._shutDownModules(this._modules.reverse())
  }

  /**
   * Shutdown the provided modules and log errors
   * @param {*} modules
   * @return {Promise}
   */
  _shutDownModules(modules) {
    if (!this._destroyPromise) {
      let destroyRunner = Promise.resolve()

      modules.forEach((module) => {
        destroyRunner = destroyRunner.then(() => {
          if (module.destroy) {
            this._logger.info(`Destroying module ${module.name}`)
            const ctx = this._buildContextForModule(module)
            const exp = this._services.has(module.export) ? this._services.get(module.export) : undefined
            return module.destroy(ctx, exp)
          } else {
            this._logger.info(`Module ${module.name} did not provide destroy method - nothing to do`)
          }
        })
        .catch((err) => {
          this._logger.error(`Error destroying ${module.name}: ${err.message}`)
          // No rethrow -> following modules might be able to shutdown in a clean way
        })
      })

      this._destroyPromise = destroyRunner.then(() => this._logger.info('Destroyed all modules'))
    }

    return this._destroyPromise
  }

  /**
   * Build the context object for modules
   * @param {*} module
   * @return {ctx} context for given module
   */
  _buildContextForModule(module) {
    const ctx = {
      logger: this._config.loggerCb(module.name),
    }

    if (module.imports) {
      module.imports.forEach((imp) => ctx[imp] = this._services.get(imp))
    }

    return ctx
  }
}

module.exports = ZeroStep
