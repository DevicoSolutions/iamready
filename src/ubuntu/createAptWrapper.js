import Logger from '../utils/logger'

const versionOutputRegex = new RegExp('[\\w]+[\\s]+([\\w\\-\\.]+)[\\s]+([\\w\\:\\.\\d\\+\\-]+)[\\s]+([\\w\\d]+)[\\s]+([\\w\\d\\-\\.\\:\\s\\,]+)')

export function createAptWrapper(ssh) {

  async function execute(tool, command, argument = null) {
    try {
      return await ssh.execute(`DEBIAN_FRONTEND=noninteractive ${tool} ${command} ${argument || ""} -y`)
    } catch (err) {
      throw err
    }
  }

  return {
    install(packages) {
      return Logger.waitFor('Installing packages ' + packages.green, execute('apt-get', 'install', packages), 'Installed ' + packages.green)
    },
    async addRepository(repo) {
      try {
        return await Logger.waitFor(`Adding repository [green:${repo}]`, execute('add-apt-repository', 'ppa:nginx/stable'))
      } catch(err) {
        Logger.log(repo.green + ' repo added')
        return true
      }
    },
    update() {
      return Logger.waitFor('Updating packages list', execute('apt-get', 'update'))
    },
    upgrade() {
      return Logger.waitFor('Upgrading packages to latest versions', execute('apt-get', 'upgrade'))
    },
    remove(packages) {
      return Logger.waitFor(`Uninstalling packages [green:${packages}]`, execute('apt-get', 'remove', packages), 'Uninstalled ' + packages.green)
    },
    async getInfo(packageName) {
      try {
        const output = await Logger.waitFor('Getting info about package ' + packageName.green, execute('dpkg -l', packageName, '| grep ' + packageName))
        const [, name, version, arch, description] = output.match(versionOutputRegex)
        Logger.log('  ' + packageName.green + ' already installed with version ' + version.yellow)
        return {
          name,
          version,
          arch,
          description,
          installed: true
        }
      } catch(err) {
        Logger.log(packageName.green + ' not installed')
        return {
          installed: false
        }
      }
    },
    purge(packages) {
      return Logger.waitFor('Purge packages ' + packages.green, execute('apt-get', 'purge', packages))
    }
  }
}