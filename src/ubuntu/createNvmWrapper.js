import Logger from '../utils/logger'

export function createNvmWrapper(ssh) {

  return {
    install() {
      return Logger.waitFor(
        'Installing [green:NVM]',
        ssh.execCommand('wget -qO- https://raw.githubusercontent.com/creationix/nvm/v0.32.1/install.sh | bash', {}),
        '[green:NVM] installed'
      )
    },
    installNode(version = 6) {
      return Logger.waitFor(
        `Installing [green:nodeJs] [yellow:${version}]`,
        ssh.execCommand(`source ~/.nvm/nvm.sh && nvm install ${version}`, {}),
        `Installed [green:nodeJs] [yellow:${version}]`
      )
    },
    async getNodeDir(version = 6) {
      const {stdout} = await Logger.waitFor(
        'Looking for [green:nodeJs] bin directory',
        ssh.execCommand(`source ~/.nvm/nvm.sh && nvm use ${version} && which npm`, {})
      )
      const [,npm] = stdout.split('\n')
      return npm.replace('/npm', '')
    },
    async registerInPath(nodeDir) {
      let {stdout: environment} = await Logger.waitFor(
        'Getting [cyan:/etc/environment] content',
        ssh.execCommand(`cat /etc/environment`, {})
      )
      if (environment.indexOf(nodeDir) === -1) {
        environment = environment.replace('PATH="', `PATH="${nodeDir}:`)
        await Logger.waitFor(
          'Setting [cyan:/etc/environment] content',
          ssh.execCommand(`echo '${environment}' > /etc/environment`, {}),
          `[cyan:/etc/environment] updated for [yellow:${nodeDir}]`
        )
      }
      return true
    }
  }
}