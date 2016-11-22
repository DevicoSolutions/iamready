import Client from 'node-ssh'

const SHELL_COMMAND = 'SHELL_COMMAND'
const DIRECTORY_LIST = 'DIRECTORY_LIST'

export function createSshAdapter(configuration) {
  const connection = new Client
  let ready = false
  let underExecution = false
  let queue = [

  ]

  async function executeQueue() {
    if (!queue.length) {
      return
    }
    underExecution = true
    do {
      const query = queue.shift()
      try {
        let result
        switch(query.type) {
          case SHELL_COMMAND: 
            result = await connection.exec(query.text, [], query.options)
            break
          case DIRECTORY_LIST:
            result = await executeList(query)
            break
        }
        query.resolve(result) 
      } catch (err) {
        query.reject(err)
      }
    } while (queue.length)
    underExecution = false
  }

  function onReady() {
    ready = true
    if (queue.length) {
      executeQueue()
    }
  }

  connection.connect(configuration).then(
    onReady,
    err => console.log('Error', err)
  )

  return {
    isReady: () => ready,
    execute(text, options = {}) {
      return new Promise((resolve, reject) => {
        queue.push({
          type: SHELL_COMMAND,
          resolve,
          reject,
          text,
          options
        })
        if (ready && !underExecution) {
          executeQueue()
        }
      })
    },
    end() {
      connection.dispose()
    }
  }
}