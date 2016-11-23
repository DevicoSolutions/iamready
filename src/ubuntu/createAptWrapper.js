
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
    purge(packages) {
      return execute('apt-get', 'purge', packages)
    }
  }
}