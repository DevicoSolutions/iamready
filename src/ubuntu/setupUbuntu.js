import {createAptWrapper} from './createAptWrapper'
import {createSystemDWrapper} from './createSystemDWrapper'

const ltsReleases = [
  '16.04',
  '18.08'
]

const supportedReleases = [
  '16.04',
  '16.10',
  '17.04'
]

export async function setupUbuntu(distro, ssh) {
  console.log(`Found ${distro.name} ${distro.release}`)
  if (supportedReleases.indexOf(distro.release) === -1) {
    throw new Error('We don\'t support this version of Ubuntu')
  }
  if (ltsReleases.indexOf(distro.release) === -1) {
    console.log(`We recommend you to use LTS version of Ubuntu for servers to receive security updates and bug fixes. You use ${distro.release} version`)
  }

  const apt = createAptWrapper(ssh)
  const systemd = createSystemDWrapper(ssh)

  await apt.addRepository('ppa:nginx/stable')
  // console.log('Nginx repo added')
  // await apt.update()
  // await apt.upgrade()
  const nginxInfo = await apt.getInfo('nginx')
  if (!nginxInfo.installed) {
    await apt.install('nginx')
    console.log('nginx installed')
  } else {
    console.log('Nginx already installed version ' + nginxInfo.version)
  }
  console.log(nginxInfo)
  const nginxServiceStatus = await systemd.status('nginx')
  console.log(nginxServiceStatus)
  !nginxServiceStatus.enabled && await systemd.enable('nginx')
  !nginxServiceStatus.running && await systemd.start('nginx')
  // await apt.install('vim git mc htop mariadb-server')
  // console.log('Installed: vim git mc htop mariadb-server')
}