
const firstLineRegex = new RegExp('● ([\\w\\.\\-]+) \\- ([\\w\\s\\.\\-]+)')
const loadedRegex = new RegExp('Loaded\\: ([\\w]+) \\(([\\w\\/\\.\\-]+)\\; ([\\w]+)')
const activeRegex = new RegExp('Active\\: ([\\w]+) \\(([\\w]+)\\) since [\\w]+ ([\\d\\-\\s\\:]+ [\\w\\/\\_]+)')

export function createSystemDWrapper(logger, ssh) {
  const systemdLogger = logger.createSubLogger(`[[blue:SystemD]]`)

  async function execute(tool, command, argument = null) {
    try {
      return await ssh.execute(`DEBIAN_FRONTEND=noninteractive ${tool} --output=json ${command} ${argument || ""}`)
    } catch (err) {
      throw err
    }
  }

  return {
    async enable(service) {
      try {
        return await systemdLogger.waitFor('Enabling service ' + service.green, execute('systemctl', 'enable', service), 'Service ' + service.green + ' enabled')
      } catch(err) {
        return true
      }
    },
    async disable(service) {
      try {
        return await systemdLogger.waitFor('Disabling service ' + service.green, execute('systemctl', 'disable', service), 'Service ' + service.green + ' disabled')
      } catch(err) {
        return true
      }
    },
    start(service) {
      return systemdLogger.waitFor('Starting service ' + service.green, execute('systemctl', 'start', service), 'Service ' + service.green + ' started')
    },
    async status(service) {
      const output = await systemdLogger.waitFor('Getting status for service ' + service.green, execute('systemctl', 'status', service))
      return output.split('\n').reduce((target, line, index) => {
        if (firstLineRegex.test(line)) {
          const [,name, description] = line.match(firstLineRegex)
          target = {
            ...target,
            name,
            description
          }
        }
        if (loadedRegex.test(line)) {
          const [, loaded, path, enabled] = line.match(loadedRegex)
          target = {
            ...target,
            loaded: loaded === 'loaded',
            path,
            enabled: enabled === 'enabled'
          }
        } else if (activeRegex.test(line)) {
          const [, active, running, startDate] = line.match(activeRegex)
          target = {
            ...target,
            active: active === 'active',
            running: running === 'running',
            startDate: new Date(startDate)
          }
        }
        return target
      }, {})
    },
    stop(service) {
      return systemdLogger.waitFor('Stoping service ' + service.green, execute('systemctl', 'stop', service), 'Service ' + service.green + ' stoped')
    },
    restart(service) {
      return systemdLogger.waitFor('Restarting service ' + service.green, execute('systemctl', 'restart', service), 'Service ' + service.green + ' restarted')
    }
  }
}