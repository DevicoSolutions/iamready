const firstLineRegex = new RegExp('● ([\\w\\.\\-]+) \\- ([\\w\\s\\.\\-]+)')
const loadedRegex = new RegExp('Loaded\\: ([\\w]+) \\(([\\w\\/\\.\\-]+)\\; ([\\w]+)')
const activeRegex = new RegExp('Active\\: ([\\w]+) \\(([\\w]+)\\) since [\\w]+ ([\\d\\-\\s\\:]+ [\\w\\/\\_]+)')

export function createSystemDWrapper(ssh) {

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
        return await execute('systemctl', 'enable', service)
      } catch(err) {
        return true
      }
    },
    async disable(service) {
      try {
        return await execute('systemctl', 'disable', service)
      } catch(err) {
        return true
      }
    },
    start(service) {
      return execute('systemctl', 'start', service)
    },
    async status(service) {
      const output = await execute('systemctl', 'status', service)
      console.log(output)
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
      return execute('systemctl', 'stop', service)
    },
    restart(service) {
      return execute('systemctl', 'restart', service)
    }
  }
}