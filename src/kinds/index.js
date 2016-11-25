import {configureMariaDb} from './configureMariaDb'
import {configureNginx} from './configureNginx'
import {configureNode} from './configureNode'

const kinds = new Map
kinds.set('mariadb', configureMariaDb)
kinds.set('nginx', configureNginx)
kinds.set('node', configureNode)

export function registerKind(name, configurator) {
  kinds.set(name, configurator)
}

export function getKinds() {
  return kinds
}
