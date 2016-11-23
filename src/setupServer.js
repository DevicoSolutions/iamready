import fs from 'fs'
import {createSshAdapter} from './adapter/createSshAdapter'
import {setupUbuntu} from './ubuntu/setupUbuntu'

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
  const ssh = createSshAdapter(configuration)
  const distro = await detectDistro(ssh)
  switch(distro.name) {
    case UBUNTU:
      await setupUbuntu(distro, ssh)
      break
    default: 
      throw new Error(`${distro.name}:${distro.release} is not yet supported.`)
  }
  ssh.end()
}

setup().then(
  data => console.log('done'),
  err => console.log(err)
)
