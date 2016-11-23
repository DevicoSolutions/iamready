
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
      return execute('apt-get', 'install', packages)
    },
    async addRepository(repo) {
      try {
        return await execute('add-apt-repository', 'ppa:nginx/stable')
      } catch(err) {
        return true
      }
    },
    update() {
      return execute('apt-get', 'update')
    },
    upgrade() {
      return execute('apt-get', 'upgrade')
    },
    remove(packages) {
      return execute('apt-get', 'remove', packages)
    },
    async getInfo(packageName) {
      try {
        const output = await execute('dpkg -l', packageName, '| grep ' + packageName)
        const [, name, version, arch, description] = output.match(versionOutputRegex)
        return {
          name,
          version,
          arch,
          description,
          installed: true
        }
      } catch(err) {
        return {
          installed: false
        }
      }
    },
    purge(packages) {
      return execute('apt-get', 'purge', packages)
    }
  }
}