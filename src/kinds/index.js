import {configureMariaDb} from './configureMariaDb'
import {configureNginx} from './configureNginx'
import {configureNode} from './configureNode'
import {configureMongo} from './configureMongo'

const kinds = new Map
kinds.set('mariadb', configureMariaDb)
kinds.set('nginx', configureNginx)
kinds.set('node', configureNode)
kinds.set('mongo', configureMongo)

export function registerKind(name, configurator) {
  kinds.set(name, configurator)
}

export function getKinds() {
  return kinds
}
