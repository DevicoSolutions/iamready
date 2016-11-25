import Client from 'node-ssh'

const SHELL_COMMAND = 'SHELL_COMMAND'
const DIRECTORY_LIST = 'DIRECTORY_LIST'

const oneLineCommands = ['cat', 'ls', 'rm', 'mkdir', 'cd', 'echo', 'source', 'which', 'wget', 'git']

export function createSshAdapter(configuration) {
  const connection = new Client
  let ready = false
  let underExecution = false
  let queue = [

  ]
  configuration = {
    ...configuration,
    tryKeyboard: true
  }

  async function executeQueue() {
    if (!queue.length) {
      return
    }
    underExecution = true
    do {
      const query = queue.shift()
      try {
        let result
        switch(query.type) {
          case SHELL_COMMAND: 
            result = await connection.exec(query.text, [], query.options)
            break
          case DIRECTORY_LIST:
            result = await executeList(query)
            break
        }
        query.resolve(result) 
      } catch (err) {
        query.reject(err)
      }
    } while (queue.length)
    underExecution = false
  }

  function onReady() {
    ready = true
    if (queue.length) {
      executeQueue()
    }
  }

  const readyPromise = connection.connect(configuration).then(
    onReady,
    err => console.log('Error', err)
  )

  function generateCallback(resolve: Function, reject: Function): Function {
    return function(error, result) {
      if (error) {
        reject(error)
      } else {
        resolve(result)
      }
    }
  }

  const pty = {
    rows: 220,
    cols: 150,
    width: 0,
    height: 0,
    term: 'vt220',
    modes: {}
  }

  async function execCommand(givenCommand: string, options: { cwd?: string, stdin?: string } = {}): Promise<{ stdout: string, stderr: string, code: number, signal: ?string }> {
    let command = givenCommand
    if (options.cwd) {
      // NOTE: Output piping cd command to hide directory non-existent errors
      command = `cd ${shellEscape([options.cwd])} 1> /dev/null 2> /dev/null; ${command}`
    }
    const output = { stdout: [], stderr: [] }
    return await new Promise(function(resolve, reject) {
      connection.connection.exec(command, options, generateCallback(function(stream) {
        stream.on('data', function(chunk) {
          const line = chunk.toString()
          if (line.indexOf('[sudo] password') !== -1) {
            stream.write(configuration.password + '\n')
          }
          output.stdout.push(chunk)
        })
        stream.stderr.on('data', function(chunk) {
          output.stderr.push(chunk)
        })
        if (options.stdin) {
          stream.write(options.stdin)
          stream.end()
        }
        stream.on('close', function(code, signal) {
          resolve({ code, signal, stdout: output.stdout.join('').trim(), stderr: output.stderr.join('').trim() })
        })
      }, reject))
    })
  }

  const adapter = {
    isReady: () => ready,
    ready() {
      return readyPromise
    },
    async execute(text, options = {}) {
      const {stdout, stderr, code} = await execCommand(text, options)
      if (code === 0) {
        return stdout
      } else {
        throw stderr
      }
    },
    execCommand(...options) {
      return connection.execCommand(...options)
    },
    end() {
      connection.dispose()
    },
    wrapCommand(command, defaultOptions = {}, inject = true) {
      if (typeof defaultOptions === 'number') { // Fix for array index
        defaultOptions = {}
      }
      if (typeof inject === 'object') {
        inject = true
      }
      let target = inject ? adapter : {}
      const name = command.indexOf('-') === -1 ? command : command.replace(/\-([a-z])/g, (_, part) => part.toUpperCase())
      injectMethods(target, command, '', defaultOptions)
      if (defaultOptions.methods) {
        defaultOptions.methods.forEach(method => injectMethods(target[name], method, command, defaultOptions))
      }
      return target[name]
    }
  }

  function injectMethods(target, method, command = '', defaultOptions = {}) {
    const name = method.indexOf('-') === -1 ? method : method.replace(/\-([a-z])/g, (_, part) => part.toUpperCase())
    let action = command != '' ? command + ' ' + method + ' ' : method + ' '
    if (defaultOptions.sudo && configuration.username !== 'root') {
      action = 'sudo ' + action
      defaultOptions.pty = pty
    }
    target[name] = (...params) => {
      if (defaultOptions.env) {
        action = Object.keys(defaultOptions.env).map(key => `${key}=${defaultOptions.env[key]}`).join(' ') + ' ' + action
      }
      return execCommand(action + params.join(' '), defaultOptions)
    }
    if (configuration.username !== 'root') {
      target[name].sudo = (...params) => {
        const sudoAction = 'sudo ' + action
        if (defaultOptions.env) {
          sudoAction = Object.keys(defaultOptions.env).map(key => `${key}=${defaultOptions.env[key]}`).join(' ') + ' ' + sudoAction
        }
        return execCommand(sudoAction + params.join(' '), {...defaultOptions, pty})
      }
    } else {
      target[name].sudo = target[name]
    }
  }

  oneLineCommands.forEach(adapter.wrapCommand)

  return adapter
}