
const versionOutputRegex = new RegExp('[\\w]+[\\s]+([\\w\\-\\.]+)[\\s]+([\\w\\:\\.\\d\\+\\-]+)[\\s]+([\\w\\d]+)[\\s]+([\\w\\d\\-\\.\\:\\s\\,]+)')

export function createAptWrapper(logger, ssh) {
  const aptLogger = logger.createSubLogger(`[[blue:Apt]]`)
  const aptget = ssh.wrapCommand('apt-get', {
    methods: ['install', 'update', 'upgrade', 'remove', 'purge'],
    sudo: true,
    env: {
      DEBIAN_FRONTEND: 'noninteractive'
    }
  })
  const dpkg = ssh.wrapCommand('dpkg', {
    sudo: true,
    env: {
      DEBIAN_FRONTEND: 'noninteractive'
    }
  })

  async function execute(tool, command, argument = null) {
    try {
      return await ssh.execCommand(`DEBIAN_FRONTEND=noninteractive ${tool} ${command} ${argument || ""} -y`, {})
    } catch (err) {
      throw err
    }
  }

  return {
    install(packages) {
      return aptLogger.waitFor(
        'Installing packages ' + packages.green,
        aptget.install(packages + ' -y'),
        'Installed ' + packages.green
      )
    },
    async addRepository(repo) {
      return await aptLogger.waitFor(
        `Adding repository [green:${repo}]`,
        execute('add-apt-repository', 'ppa:nginx/stable'),
        repo.green + ' repo added'
      )
    },
    update() {
      return aptLogger.waitFor('Updating packages list', aptget.update(' -y'))
    },
    upgrade() {
      return aptLogger.waitFor('Upgrading packages to latest versions', aptget.upgrade(' -y'))
    },
    remove(packages) {
      return aptLogger.waitFor(
        `Uninstalling packages [green:${packages}]`,
        aptget.remove(packages + ' -y'),
        'Uninstalled ' + packages.green
      )
    },
    async getInfo(packageName) {
      let {stdout: output, code} = await aptLogger.waitFor(
        'Getting info about package ' + packageName.green,
        dpkg.execCommand('-l ' + packageName + ' | grep ' + packageName)
      )
      output = output.split('\n').pop()
      if (code == 0 && versionOutputRegex.test(output)) {
        const [, name, version, arch, description] = output.match(versionOutputRegex)
        aptLogger.log('  ' + packageName.green + ' already installed with version ' + version.yellow)
        return {
          name,
          version,
          arch,
          description,
          installed: true
        }
      } else {
        aptLogger.log(packageName.green + ' not installed')
        return {
          installed: false
        }
      }
    },
    purge(packages) {
      return aptLogger.waitFor(
        'Purge packages ' + packages.green,
        aptget.purge(packages + ' -y')
      )
    }
  }
}