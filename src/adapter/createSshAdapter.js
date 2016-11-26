/** @flow */
import Client from 'node-ssh'
import type {Logger, SshContext, ExecOptions} from '../types'

const oneLineCommands = ['cat', 'ls', 'rm', 'mkdir', 'cd', 'echo', 'source', 'which', 'wget', 'git', 'sh']

export function createSshAdapter(configuration: {[key: string]: any}, logger: Logger): SshContext {
  const connection = new Client
  let ready = false
  configuration = {
    ...configuration
  }

  function onReady() {
    ready = true
  }

  const readyPromise = connection.connect(configuration).then(
    onReady,
    err => logger.log('Error', err)
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
    term: 'xterm',
    modes: {}
  }

  async function execCommand(givenCommand: string, options: ExecOptions = {}): Promise<{ stdout: string, stderr: string, code: number, signal: ?string }> {
    let command = givenCommand
    if (options.cwd) {
      // NOTE: Output piping cd command to hide directory non-existent errors
      command = `cd ${options.cwd} 1> /dev/null 2> /dev/null; ${command}`
    }
    if (typeof options.env === 'object') {
      command = Object.keys(options.env).map(key => `${key}=${ options.env && options.env[key] || ''}`).join(' ') + ' ' + command
    }
    const output = { stdout: [], stderr: [] }
    return await new Promise((resolve, reject) => {
      connection.connection.exec(command, {pty, ...options}, generateCallback(stream => {
        stream.on('data', chunk => {
          const line = chunk.toString()
          if (line.indexOf('[sudo] password') !== -1) {
            stream.write(configuration.password + '\n')
          } else {
            output.stdout.push(chunk.toString().replace(/\r/g, '')) // Remove \r from end of line
          }
        })
        stream.stderr.on('data', chunk => output.stderr.push(chunk))
        if (options.stdin) {
          stream.write(options.stdin)
          stream.end()
        }
        stream.on('close', (code, signal) => {
          resolve({ code, signal, stdout: output.stdout.join('').trim(), stderr: output.stderr.join('').trim() })
        })
      }, reject))
    })
  }

  // $FlowIgnore stub before populate
  function emptyCommand() {

  }
  // $FlowIgnore stub before populate
  emptyCommand.sudo = () => {}
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
    cat: emptyCommand, ls: emptyCommand, rm: emptyCommand, mkdir: emptyCommand, cd: emptyCommand, echo: emptyCommand, source: emptyCommand, which: emptyCommand, wget: emptyCommand, git: emptyCommand, sh: emptyCommand,
    wrapCommand(command, defaultOptions = {}, inject = true) {
      if (typeof defaultOptions === 'number') { // Fix for array index
        defaultOptions = {}
      }
      if (typeof inject === 'object') {
        inject = true
      }
      const target = inject ? adapter : {}
      const name = command.indexOf('-') === -1 ? command : command.replace(/\-([a-z])/g, (_, part) => part.toUpperCase())
      injectMethods(target, command, '', defaultOptions)
      if (defaultOptions.methods) {
        // $FlowIgnore WAT?
        defaultOptions.methods.forEach(method => injectMethods(target[name], method, command, defaultOptions))
      }
      return target[name]
    }
  }

  function injectMethods(target, method, command = '', defaultOptions: ExecOptions = {}) {
    const name = method.indexOf('-') === -1 ? method : method.replace(/\-([a-z])/g, (_, part) => part.toUpperCase())
    let action = command != '' ? command + ' ' + method + ' ' : method + ' '
    if (defaultOptions.sudo && configuration.username !== 'root') {
      action = 'sudo ' + action
    }
    function comm(...params) {
      return execCommand(action + params.join(' '), defaultOptions)
    }
    if (configuration.username !== 'root') {
      comm.sudo = (...params) => execCommand('sudo ' + action + params.join(' '), defaultOptions)
    } else {
      comm.sudo = target[name]
    }
    target[name] = comm
  }

  oneLineCommands.forEach(adapter.wrapCommand)

  return adapter
}