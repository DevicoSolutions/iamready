/** @flow */
import type {SetupContext} from '../types'

export async function configureMongo(ctx: SetupContext) {
  const {repo, ssh, service, distro} = ctx
  const mongoInfo = await repo.getInfo('mongodb-org')
  if (!mongoInfo.installed) {
    if (distro.name === 'Ubuntu') {
      await repo.addKey('--keyserver hkp://keyserver.ubuntu.com:80 --recv EA312927')
      await ssh.echo.sudo('"deb http://repo.mongodb.org/apt/ubuntu xenial/mongodb-org/3.2 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-3.2.list')
    }
    await repo.update()
    await repo.install('mongodb-org')
    await ssh.putFile(__dirname + '/mongo/mongo.service', 'mongod.service')
    await ssh.mv.sudo('-f ~/mongod.service /lib/systemd/system/mongod.service')
  }
  const mongoServiceInfo = await service.status('mongod')
  if (!mongoServiceInfo.enabled) {
    await service.enable('mongod')
  }
  if (!mongoServiceInfo.running) {
    await service.start('mongod')
  } else {
    await service.restart('mongod')
  }
}