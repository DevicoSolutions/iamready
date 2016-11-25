import fs from 'fs'
import {createSshAdapter} from './adapter/createSshAdapter'
import {setupUbuntu} from './ubuntu/setupUbuntu'
import 'colors'
import Logger, {createLogger} from './utils/logger'

const UBUNTU = 'Ubuntu'

async function detectDistro(ssh) {
  const lsbRelease = await ssh.execute('cat /etc/lsb-release')
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
      switch(distro.name) {
        case UBUNTU:
          await setupUbuntu(distro, ssh, config, serverLogger)
          break
        default: 
          throw new Error(`[green:${distro.name}]:[yellow:${distro.release}] is not yet supported.`)
      }
      ssh.end()
    }
  }
}

setup().then(
  data => console.log('done'),
  err => console.log(err)
)
