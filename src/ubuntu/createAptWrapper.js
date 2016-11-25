
const versionOutputRegex = new RegExp('[\\w]+[\\s]+([\\w\\-\\.]+)[\\s]+([\\w\\:\\.\\d\\+\\-]+)[\\s]+([\\w\\d]+)[\\s]+([\\w\\d\\-\\.\\:\\s\\,]+)')

export function createAptWrapper({logger, ssh}) {
  const aptLogger = logger.createSubLogger(`[[blue:Apt]]`)
  const aptGet = ssh.wrapCommand('apt-get', {
    methods: ['install', 'update', 'upgrade', 'remove', 'purge'],
    sudo: true,
    env: {
      DEBIAN_FRONTEND: 'noninteractive'
    }
  }, false)
  const dpkg = ssh.wrapCommand('dpkg', {
    env: {
      DEBIAN_FRONTEND: 'noninteractive'
    }
  }, false)

  async function execute(tool, command, argument = null) {
    try {
      return await ssh.execCommand(`DEBIAN_FRONTEND=noninteractive ${tool} ${command} ${argument || ""} -y`, {})
    } catch (err) {
      throw err
    }
  }

  return {
    install(repos) {
      return aptLogger.waitFor(
        'Installing repos ' + repos.green,
        aptGet.install(repos + ' -y'),
        'Installed ' + repos.green
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
      return aptLogger.waitFor('Updating repos list', aptGet.update(' -y'))
    },
    upgrade() {
      return aptLogger.waitFor('Upgrading repos to latest versions', aptGet.upgrade(' -y'))
    },
    remove(repos) {
      return aptLogger.waitFor(
        `Uninstalling repos [green:${repos}]`,
        aptGet.remove(repos + ' -y'),
        'Uninstalled ' + repos.green
      )
    },
    async getInfo(repoName) {
      let {stdout: output, code} = await aptLogger.waitFor(
        'Getting info about repo ' + repoName.green,
        dpkg('-l ' + repoName + ' | grep ' + repoName)
      )
      output = output.split('\n').pop()
      if (code == 0 && versionOutputRegex.test(output)) {
        const [, name, version, arch, description] = output.match(versionOutputRegex)
        aptLogger.log('  ' + repoName.green + ' already installed with version ' + version.yellow)
        return {
          name,
          version,
          arch,
          description,
          installed: true
        }
      } else {
        aptLogger.log(repoName.green + ' not installed')
        return {
          installed: false
        }
      }
    },
    purge(repos) {
      return aptLogger.waitFor(
        'Purge repos ' + repos.green,
        aptGet.purge(repos + ' -y')
      )
    }
  }
}