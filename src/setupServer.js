/** @flow */
import {createSshAdapter} from './adapter/createSshAdapter'
import {setupUbuntu} from './ubuntu/setupUbuntu'
import 'colors'
import Logger, {createLogger} from './utils/logger'
import {getKinds} from './kinds'
import type {SetupContext} from './types'

const UBUNTU = 'Ubuntu'

async function detectDistro(ssh) {
  const {stdout: lsbRelease} = await ssh.cat('/etc/lsb-release')
  const [name, release, codeName] = lsbRelease.split('\n').map(line => line.split('=')[1])
  return {
    name,
    release,
    codeName
  }
}

function loadConfiguration(): {[key: string]: any} {
  if (!process.env.PWD) {
    throw new Error('Please run from folder with env.js file')
  }
  const path = process.env.PWD + '/env.js'
  // $FlowIgnore must validate that path exists
  return require(path)
}

async function setup() {
  const configuration = loadConfiguration()
  for (const key in configuration.servers) {
    const serverTypeLogger = createLogger(`[[magenta:${key}]]`)
    const config = configuration.servers[key]
    for (const credential of config.credentials) {
      const serverLogger = serverTypeLogger.createSubLogger(`[[magenta:Server ${credential.host}]]`)
      const ssh = createSshAdapter(credential, serverLogger)
      await ssh.ready()
      const distro = await serverLogger.waitFor('[green:Detecting distro]', detectDistro(ssh))
      serverLogger.log(`Found [green:${distro.name}] [yellow:${distro.release}]`)
      // $FlowIgnore should be populated by distro
      const ctx: SetupContext = {distro, ssh, config, logger: serverLogger}
      switch(distro.name) {
        case UBUNTU:
          await setupUbuntu(ctx)
          break
        default: 
          throw new Error(`[green:${distro.name}]:[yellow:${distro.release}] is not yet supported.`)
      }
      await configure(ctx)
      ssh.end()
    }
  }
}

async function configure(ctx) {
  ctx.repo.install('vim git curl htop')
  const kinds = getKinds()
  for (const kind of ctx.config.kinds) {
    if (kinds.has(kind)) {
      await kinds.get(kind)(ctx)
    } else {
      ctx.logger.log(`Kind ${kind} not registered`)
    }
  }
}

setup().then(
  () => Logger.log('done'),
  err => Logger.log(err)
)
