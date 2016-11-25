import {createAptWrapper} from './createAptWrapper'
import {createSystemDWrapper} from './createSystemDWrapper'
import {createMariaDbWrapper} from './createMariaDbWrapper'
import {createNvmWrapper} from './createNvmWrapper'

const ltsReleases = [
  '16.04',
  '18.08'
]

const supportedReleases = [
  '16.04',
  '16.10',
  '17.04'
]

const kinds = {
  async nginx({apt, systemd}, app) {
    await apt.addRepository('ppa:nginx/stable')
    const nginxInfo = await apt.getInfo('nginx')
    if (!nginxInfo.installed) {
      await apt.update()
      await apt.install('nginx')
    }
    const nginxServiceStatus = await systemd.status('nginx')
    if (!nginxServiceStatus.enabled) {
      await systemd.enable('nginx')
    }
    if (nginxServiceStatus.running) {
      await systemd.restart('nginx')
    } else {
      await systemd.start('nginx')
    }
  },
  async node({ssh, nvm}, app) {
    const config = app.config.node || {
      version: 6
    }
    await nvm.install()
    await nvm.installNode(config.version)
    await nvm.setDefaultNode(config.version)
    const nodeDir = await nvm.getNodeDir(config.version)
    await nvm.registerInPath(nodeDir)
  },
  async mariadb({apt, systemd, mariadb}, app) {
    const mariadbInfo = await apt.getInfo('mariadb-server')
    const {rootUser = 'root', rootPassword, username, password, database} = app.config.mariadb
    if (!mariadbInfo.installed) {
      await apt.install('mariadb-server')
      const mysqlServiceStatus = await systemd.status('mysql')
      if (!mysqlServiceStatus.enabled) {
        await systemd.enable('mysql')
      }
      if (mysqlServiceStatus.running) {
        await systemd.restart('mysql')
      } else {
        await systemd.start('mysql')
      }
      await mariadb.setUserPassword(rootUser, rootPassword)
    }
    const users = await mariadb.getUsers()
    const databases = await mariadb.getDatabases()
    if (users.indexOf(username) === -1) {
      await mariadb.createUser(username, password)
    }
    if (databases.indexOf(database) === -1) {
      await mariadb.createDatabase(database)
      await mariadb.grantPrivilegesToDatabase(username, database)
    } else if (users.indexOf(username) === -1) {
      await mariadb.grantPrivilegesToDatabase(username, database)
    }
  }
}

const oneLineCommands = ['dpkg']

export async function setupUbuntu(distro, ssh, app, logger) {
  if (supportedReleases.indexOf(distro.release) === -1) {
    throw new Error('We don\'t support this version of Ubuntu')
  }
  if (ltsReleases.indexOf(distro.release) === -1) {
    logger.log(`We recommend you to use LTS version of Ubuntu for servers to receive security updates and bug fixes. You use [yellow:${distro.release}] version`.red)
  }
  ssh.wrapCommand('dpkg', {
    env: {
      DEBIAN_FRONTEND: 'noninteractive'
    }
  })

  const apt = createAptWrapper(logger, ssh)
  const systemd = createSystemDWrapper(logger, ssh)
  const mariadb = createMariaDbWrapper(logger, ssh, app)
  const nvm = createNvmWrapper(logger, ssh)
  const ctx = {
    apt,
    logger,
    systemd,
    ssh,
    mariadb,
    nvm
  }
  await apt.install('vim mc htop curl build-essential git')
  for (let kind of app.kinds) {
    if (kinds.hasOwnProperty(kind)) {
      await kinds[kind](ctx, app)
    } else {
      logger.log(`[red:${kind}] kind is not implemented yet. Skipping`)
    }
  }
}