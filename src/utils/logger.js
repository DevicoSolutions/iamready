/** @flow */
import type {Logger} from '../types'

const colorPartRegexp = new RegExp('\\[([\\w]+)\\:([\\w\\d\\s\\:\\|\\\\\/\\.\\-\\;\\(\\)]+)\\]', 'g')
const splinner = ['|', '/', '-', '\\', '|', '/', '-', '\\']

export function createLogger(prefix: string = ''): Logger {
  return {
    log(text, breakLine = true) {
      text = `${prefix} ${text}`
      process.stdout.write(text.replace(colorPartRegexp, (_,color, text) => text[color]) + (breakLine ? '\n' : ''))
    },
    waitFor(text, promise, onSuccess = '', onFail = '') {
      let i = 0
      this.log('  ' + text, false)
      const interval = setInterval(() => {
        // $FlowIgnore stdout have this
        process.stdout.clearLine()
        // $FlowIgnore stdout have this
        process.stdout.cursorTo(0)
        i = (i + 1) % 7
        const dots = splinner[i] + ' '
        this.log(`[cyan:${dots}] ${text}`, false)
      }, 300)
      const clear = () => {
        clearInterval(interval)
        // $FlowIgnore stdout have this
        process.stdout.clearLine()
        // $FlowIgnore stdout have this
        process.stdout.cursorTo(0)
      }
      promise.then(
        () => {
          clear()
          // $FlowIgnore colors
          onSuccess != '' && this.log('✓ '.green + onSuccess)
        },
        () => {
          clear()
          // $FlowIgnore colors
          onFail != '' && this.log('✗ '.red + onFail)
        },
      )
      return promise
    },
    createSubLogger(newPrefix) {
      return createLogger(`${prefix} ${newPrefix}`)
    }
  }
}

export default createLogger()