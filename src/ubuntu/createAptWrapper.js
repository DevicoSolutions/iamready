
const versionOutputRegex = new RegExp('[\\w]+[\\s]+([\\w\\-\\.]+)[\\s]+([\\w\\:\\.\\d\\+\\-]+)[\\s]+([\\w\\d]+)[\\s]+([\\w\\d\\-\\.\\:\\s\\,]+)')

export function createAptWrapper(logger, ssh) {
  const aptLogger = logger.createSubLogger(`[[blue:Apt]]`)

  async function execute(tool, command, argument = null) {
    try {
      return await ssh.execute(`DEBIAN_FRONTEND=noninteractive ${tool} ${command} ${argument || ""} -y`)
    } catch (err) {
      throw err
    }
  }

  return {
    install(packages) {
      return aptLogger.waitFor('Installing packages ' + packages.green, execute('apt-get', 'install', packages), 'Installed ' + packages.green)
    },
    async addRepository(repo) {
      try {
        return await aptLogger.waitFor(`Adding repository [green:${repo}]`, execute('add-apt-repository', 'ppa:nginx/stable'))
      } catch(err) {
        aptLogger.log(repo.green + ' repo added')
        return true
      }
    },
    update() {
      return aptLogger.waitFor('Updating packages list', execute('apt-get', 'update'))
    },
    upgrade() {
      return aptLogger.waitFor('Upgrading packages to latest versions', execute('apt-get', 'upgrade'))
    },
    remove(packages) {
      return aptLogger.waitFor(`Uninstalling packages [green:${packages}]`, execute('apt-get', 'remove', packages), 'Uninstalled ' + packages.green)
    },
    async getInfo(packageName) {
      try {
        const output = await aptLogger.waitFor('Getting info about package ' + packageName.green, execute('dpkg -l', packageName, '| grep ' + packageName))
        const [, name, version, arch, description] = output.match(versionOutputRegex)
        aptLogger.log('  ' + packageName.green + ' already installed with version ' + version.yellow)
        return {
          name,
          version,
          arch,
          description,
          installed: true
        }
      } catch(err) {
        aptLogger.log(packageName.green + ' not installed')
        return {
          installed: false
        }
      }
    },
    purge(packages) {
      return aptLogger.waitFor('Purge packages ' + packages.green, execute('apt-get', 'purge', packages))
    }
  }
}