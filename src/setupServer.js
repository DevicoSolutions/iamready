import fs from 'fs'
import {createSshAdapter} from './adapter/createSshAdapter'
import {setupUbuntu} from './ubuntu/setupUbuntu'
import 'colors'
import Logger, {createLogger} from './utils/logger'
import {getKinds} from './kinds'

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

function loadConfiguration() {
  const path = process.env.PWD + '/env.js'
  return require(path)
}

async function setup() {
  const configuration = loadConfiguration()
  for (let key in configuration.servers) {
    const serverTypeLogger = createLogger(`[[magenta:${key}]]`)
    const config = configuration.servers[key]
    for (let credential of config.credentials) {
      const serverLogger = serverTypeLogger.createSubLogger(`[[magenta:Server ${credential.host}]]`)
      const ssh = createSshAdapter(credential)
      await ssh.ready()
      const distro = await serverLogger.waitFor('Detecting distro'.green, detectDistro(ssh))
      serverLogger.log(`Found [green:${distro.name}] [yellow:${distro.release}]`)
      const ctx = {distro, ssh, config, logger: serverLogger}
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
  for (let kind of ctx.config.kinds) {
    if (kinds.has(kind)) {
      await kinds.get(kind)(ctx)
    } else {
      ctx.logger.log(`Kind ${kind} not registered`)
    }
  }
}

setup().then(
  data => console.log('done'),
  err => console.log(err)
)
