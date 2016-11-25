
export function createNvmWrapper({logger, ssh}) {
  const nvmLogger = logger.createSubLogger(`[[blue:NVM]]`)
  return {
    installNvm() {
      return nvmLogger.waitFor(
        'Installing [green:NVM]',
        ssh.wget('-qO- https://raw.githubusercontent.com/creationix/nvm/v0.32.1/install.sh | bash'),
        '[green:NVM] installed'
      )
    },
    install(version = 6) {
      return nvmLogger.waitFor(
        `Installing [green:nodeJs] [yellow:${version}]`,
        ssh.source(`~/.nvm/nvm.sh && nvm install ${version}`),
        `Installed [green:nodeJs] [yellow:${version}]`
      )
    },
    setDefaultNode(version = 6) {
      return nvmLogger.waitFor(
        `Setting default node [green:nodeJs] [yellow:${version}]`,
        ssh.source(`~/.nvm/nvm.sh && nvm alias default ${version}`)
      )
    },
    async getNodeDir(version = 6) {
      const {stdout, stderr} = await nvmLogger.waitFor(
        'Looking for [green:nodeJs] bin directory',
        ssh.source(`~/.nvm/nvm.sh && nvm use ${version} && echo $PATH`)
      )
      const [,path] = stdout.split('\n')
      return path.split(':').filter(part => part.indexOf('.nvm') !== -1).join(':')
    },
    async registerInPath(nodeDir) {
      let {stdout: environment} = await nvmLogger.waitFor(
        'Getting [cyan:/etc/environment] content',
        ssh.cat(`/etc/environment`)
      )
      if (environment.indexOf(nodeDir) === -1) {
        // Clear old versions
        environment = environment.split(':').filter(part => part.indexOf('.nvm') === -1).join(':')
        environment = environment.replace('PATH="', `PATH="${nodeDir}:`).replace(/\"/g, '\\"')
        await nvmLogger.waitFor(
          'Setting [cyan:/etc/environment] content',
          ssh.sh.sudo(`-c "echo '${environment}' > /etc/environment"`),
          `[cyan:/etc/environment] updated for [yellow:${nodeDir}]`
        )
      }
      return true
    }
  }
}