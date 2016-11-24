import fs from 'fs'
import {createSshAdapter} from './adapter/createSshAdapter'
import {setupUbuntu} from './ubuntu/setupUbuntu'
import 'colors'
import Logger from './utils/logger'

const UBUNTU = 'Ubuntu'

async function detectDistro(ssh) {
  const lsbRelease = await ssh.execute('cat /etc/lsb-release', {cwd: '/etc'})
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
    const config = configuration.servers[key]
    for (let credential of config.credentials) {
      const ssh = createSshAdapter(credential)
      const distro = await Logger.waitFor('Detecting distro'.green, detectDistro(ssh))
      Logger.log(`Found [green:${distro.name}] [yellow:${distro.release}]`)
      switch(distro.name) {
        case UBUNTU:
          await setupUbuntu(distro, ssh, config)
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
