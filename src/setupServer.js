import {createSshAdapter} from './adapter/createSshAdapter'
import {setupUbuntu} from './distros/setupUbuntu'

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

async function setup() {
  const ssh = createSshAdapter({
    host: '0.0.0.0',
    port: 22,
    username: 'root',
    password: 'adfsdafs'
  })
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
