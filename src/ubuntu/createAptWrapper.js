/** @flow */
import type {SetupContext, SetupRepoContext} from '../types'

const versionOutputRegex = new RegExp('[\\w]+[\\s]+([\\w\\-\\.]+)[\\s]+([\\w\\:\\.\\d\\+\\-]+)[\\s]+([\\w\\d]+)[\\s]+([\\w\\d\\-\\.\\:\\s\\,]+)')

export function createAptWrapper(ctx: SetupContext): SetupRepoContext {
  const {logger, ssh} = ctx
  const aptLogger = logger.createSubLogger(`[[blue:Apt]]`)
  const aptGet = ssh.wrapCommand('apt-get', {
    methods: ['install', 'update', 'upgrade', 'remove', 'purge'],
    sudo: true,
    env: {
      DEBIAN_FRONTEND: 'noninteractive'
    }
  }, false)
  const aptKey = ssh.wrapCommand('apt-key', {
    methods: ['adv'],
    duso: true,
    env: {
      DEBIAN_FRONTEND: 'noninteractive'
    }
  })
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
    install(packages) {
      return aptLogger.waitFor(
        `Installing [green:${packages}]`,
        aptGet.install(packages + ' --allow-unauthenticated -y'),
        `Installed [green:${packages}]`
      )
    },
    async addRepository(repo) {
      return await aptLogger.waitFor(
        `Adding repository [green:${repo}]`,
        execute('add-apt-repository', 'ppa:nginx/stable'),
        `[green:${repo}] repo added`
      )
    },
    addKey(key) {
      return aptKey.adv(key)
    },
    update() {
      return aptLogger.waitFor('Updating repos list', aptGet.update(' -y'))
    },
    upgrade() {
      return aptLogger.waitFor('Upgrading repos to latest versions', aptGet.upgrade(' -y'))
    },
    remove(packages) {
      return aptLogger.waitFor(
        `Uninstalling repos [green:${packages}]`,
        aptGet.remove(packages + ' -y'),
        `Uninstalled [green:${packages}]`
      )
    },
    async getInfo(packageName) {
      let {stdout: output, code} = await aptLogger.waitFor(
        `Getting info about repo ' + [green:${packageName}]`,
        dpkg('-l ' + packageName + ' | grep ' + packageName)
      )
      output = output.split('\n').pop()
      if (code == 0 && versionOutputRegex.test(output)) {
        const [, name, version, arch, description] = output.match(versionOutputRegex)
        aptLogger.log(`  [green:${packageName}] already installed with version [yellow:${version}]`)
        return {
          name,
          version,
          arch,
          description,
          installed: true
        }
      } else {
        aptLogger.log(`[green:${packageName}] not installed`)
        return {
          installed: false
        }
      }
    },
    purge(packages) {
      return aptLogger.waitFor(
        `Purge repos [green:${packages}]`,
        aptGet.purge(packages + ' -y')
      )
    }
  }
}