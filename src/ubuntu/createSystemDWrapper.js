
const firstLineRegex = new RegExp('● ([\\w\\.\\-]+) \\- ([\\w\\s\\.\\-]+)')
const loadedRegex = new RegExp('Loaded\\: ([\\w]+) \\(([\\w\\/\\.\\-]+)\\; ([\\w]+)')
const activeRegex = new RegExp('Active\\: ([\\w]+) \\(([\\w]+)\\) since [\\w]+ ([\\d\\-\\s\\:]+ [\\w\\/\\_]+)')

export function createSystemDWrapper(logger, ssh) {
  const systemdLogger = logger.createSubLogger(`[[blue:SystemD]]`)
  const systemctl = ssh.wrapCommand('systemctl', {
    methods: ['enable', 'disable', 'start', 'stop', 'status', 'restart'],
    sudo: true
  }, false)

  return {
    async enable(service) {
      return systemdLogger.waitFor(
        'Enabling service ' + service.green,
        systemctl.enable(service),
        'Service ' + service.green + ' enabled'
      )
    },
    async disable(service) {
      systemdLogger.waitFor(
        'Disabling service ' + service.green,
        systemctl.disable(service),
        'Service ' + service.green + ' disabled'
      )
    },
    start(service) {
      return systemdLogger.waitFor(
        'Starting service ' + service.green,
        systemctl.start(service),
        'Service ' + service.green + ' started'
      )
    },
    async status(service) {
      const {stdout: output} = await systemdLogger.waitFor('Getting status for service ' + service.green, systemctl.status(service))
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
      return systemdLogger.waitFor(
        'Stoping service ' + service.green,
        systemctl.stop(service),
        'Service ' + service.green + ' stoped'
      )
    },
    restart(service) {
      return systemdLogger.waitFor(
        'Restarting service ' + service.green,
        systemctl.restart(service),
        'Service ' + service.green + ' restarted'
      )
    }
  }
}