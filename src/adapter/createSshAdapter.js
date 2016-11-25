import Client from 'node-ssh'

const SHELL_COMMAND = 'SHELL_COMMAND'
const DIRECTORY_LIST = 'DIRECTORY_LIST'

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

  connection.connect(configuration).then(
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
          chunk = chunk.toString()
          if (chunk.indexOf('[sudo] password') !== -1) {
            stream.write(configuration.password)
            stream.end()
          }
          console.log(chunk)
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

  return {
    isReady: () => ready,
    execute(text, options = {}) {
      return new Promise((resolve, reject) => {
        queue.push({
          type: SHELL_COMMAND,
          resolve,
          reject,
          text,
          options
        })
        if (ready && !underExecution) {
          executeQueue()
        }
      })
    },
    wrapCommand(command, defaultOptions = {}) {
      if (defaultOptions.sudo && configuration.username !== 'root') {
        command = 'sudo ' + command
        defaultOptions.pty = true
      }
      if (defaultOptions.env) {
        command = Object.keys(defaultOptions.env).map(key => `${key}=${defaultOptions.env[key]}`).join(' ') + ' ' + command
      }
      const client = {
        exec(instruction, args = [], options = {}) {
          return connection.exec(command + ' ' + instruction, args, {...defaultOptions, ...options})
        },
        execCommand(instruction, options = {}) {
          return execCommand(command + ' ' + instruction, {...defaultOptions, ...options})
        }
      }
      if (defaultOptions.methods) {
        defaultOptions.methods.forEach(method => {
          client[method] = (instruction, options) => client.execCommand(method + ' ' + instruction, options)
        })
      }

      return client
    },
    execCommand(...options) {
      return connection.execCommand(...options)
    },
    end() {
      connection.dispose()
    }
  }
}