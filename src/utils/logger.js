
const colorPartRegexp = new RegExp('\\[([\\w]+)\\:([\\w\\d\\s\\:\\/\\.\\-\\;\\(\\)]+)\\]', 'g')
const splinner = ['|', '/', '-', '\\', '|', '/', '-', '\\']

export function createLogger(prefix = "") {
  return {
    log(text, breakLine = true) {
      text = `${prefix} ${text}`
      process.stdout.write(text.replace(colorPartRegexp, (_,color, text) => text[color]) + (breakLine ? '\n' : ''))
    },
    waitFor(text, promise, onSuccess = "", onFail = "") {
      let i = 0
      this.log('  ' + text, false)
      const interval = setInterval(() => {
        process.stdout.clearLine()
        process.stdout.cursorTo(0)
        i = (i + 1) % (splinner.length - 1)
        var dots = splinner[i - 1] + ' '
        this.log(dots.cyan + text, false)
      }, 300)
      const clear = () => {
        clearInterval(interval)
        process.stdout.clearLine()
        process.stdout.cursorTo(0)
      }
      promise.then(
        () => {
          clear()
          onSuccess != "" && this.log('✓ '.green + onSuccess)
        },
        () => {
          clear()
          onFail != "" && this.log('✗ '.red + onFail)
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