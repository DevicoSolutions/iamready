/** @flow */
import type {SetupContext, ServiceContext} from '../types'

const firstLineRegex = new RegExp('● ([\\w\\.\\-]+) \\- ([\\w\\s\\.\\-]+)')
const loadedRegex = new RegExp('Loaded\\: ([\\w]+) \\(([\\w\\/\\.\\-]+)\\; ([\\w]+)')
const activeRegex = new RegExp('Active\\: ([\\w]+) \\(([\\w]+)\\) since [\\w]+ ([\\d\\-\\s\\:]+ [\\w\\/\\_]+)')

export function createSystemDWrapper(ctx: SetupContext): ServiceContext {
  const {logger, ssh} = ctx
  const systemdLogger = logger.createSubLogger(`[[blue:SystemD]]`)
  const systemctl = ssh.wrapCommand('systemctl', {
    methods: ['enable', 'disable', 'start', 'stop', 'status', 'restart'],
    sudo: true
  }, false)

  return {
    async enable(service) {
      return systemdLogger.waitFor(
        'Enabling service ' + `[green:${service}]`,
        systemctl.enable(service),
        'Service ' + `[green:${service}]` + ' enabled'
      )
    },
    async disable(service) {
      return systemdLogger.waitFor(
        'Disabling service ' + `[green:${service}]`,
        systemctl.disable(service),
        'Service ' + `[green:${service}]` + ' disabled'
      )
    },
    start(service) {
      return systemdLogger.waitFor(
        'Starting service ' + `[green:${service}]`,
        systemctl.start(service),
        'Service ' + `[green:${service}]` + ' started'
      )
    },
    async status(service) {
      const {stdout: output} = await systemdLogger.waitFor('Getting status for service ' + `[green:${service}]`, systemctl.status(service))
      return output.split('\n').reduce((target, line) => {
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
        'Stoping service ' + `[green:${service}]`,
        systemctl.stop(service),
        'Service ' + `[green:${service}]` + ' stoped'
      )
    },
    restart(service) {
      return systemdLogger.waitFor(
        'Restarting service ' + `[green:${service}]`,
        systemctl.restart(service),
        'Service ' + `[green:${service}]` + ' restarted'
      )
    }
  }
}