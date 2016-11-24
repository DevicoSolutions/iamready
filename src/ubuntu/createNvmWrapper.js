
export function createNvmWrapper(logger, ssh) {
  const nvmLogger = logger.createSubLogger(`[[blue:NVM]]`)
  return {
    install() {
      return nvmLogger.waitFor(
        'Installing [green:NVM]',
        ssh.execCommand('wget -qO- https://raw.githubusercontent.com/creationix/nvm/v0.32.1/install.sh | bash', {}),
        '[green:NVM] installed'
      )
    },
    installNode(version = 6) {
      return nvmLogger.waitFor(
        `Installing [green:nodeJs] [yellow:${version}]`,
        ssh.execCommand(`source ~/.nvm/nvm.sh && nvm install ${version}`, {}),
        `Installed [green:nodeJs] [yellow:${version}]`
      )
    },
    async getNodeDir(version = 6) {
      const {stdout} = await nvmLogger.waitFor(
        'Looking for [green:nodeJs] bin directory',
        ssh.execCommand(`source ~/.nvm/nvm.sh && nvm use ${version} && which npm`, {})
      )
      const [,npm] = stdout.split('\n')
      return npm.replace('/npm', '')
    },
    async registerInPath(nodeDir) {
      let {stdout: environment} = await nvmLogger.waitFor(
        'Getting [cyan:/etc/environment] content',
        ssh.execCommand(`cat /etc/environment`, {})
      )
      if (environment.indexOf(nodeDir) === -1) {
        environment = environment.replace('PATH="', `PATH="${nodeDir}:`)
        await nvmLogger.waitFor(
          'Setting [cyan:/etc/environment] content',
          ssh.execCommand(`echo '${environment}' > /etc/environment`, {}),
          `[cyan:/etc/environment] updated for [yellow:${nodeDir}]`
        )
      }
      return true
    }
  }
}