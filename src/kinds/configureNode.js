/** @flow */
import type {SetupContext} from '../types'

export async function configureNode(ctx: SetupContext) {
  const {node, config} = ctx
  const nodeConfig = config.config.node || {
    version: 6
  }
  await node.installNvm()
  await node.install(nodeConfig.version)
  await node.setDefaultNode(nodeConfig.version)
  const nodeDir = await node.getNodeDir(nodeConfig.version)
  await node.registerInPath(nodeDir)
}