import {createSystemDWrapper} from './createSystemDWrapper'
import {createMariaDbWrapper} from './createMariaDbWrapper'
import {createNvmWrapper} from './createNvmWrapper'

function emptyWrapper() {
  throw new Error('Not implemented wrapper for context')
}

const wrappers = new Map
wrappers.set('repo', emptyWrapper)
wrappers.set('service', createSystemDWrapper)
wrappers.set('mariadb', createMariaDbWrapper)
wrappers.set('node', createNvmWrapper)

export function registerWrapper(name, createWrapper) {
  wrappers.set(name, createWrapper)
}

export function setupContext(ctx) {
  wrappers.forEach((creator, key) => {
    ctx[key] = creator(ctx)
  })
  return ctx
}