/** @flow */
import type {SetupContext} from '../types'

export async function configureMariaDb(ctx: SetupContext) {
  const {repo, service, mariadb, config} = ctx
  const mariadbInfo = await repo.getInfo('mariadb-server')
  const {rootUser = 'root', rootPassword, username, password, database} = config.config.mariadb
  if (!mariadbInfo.installed) {
    await repo.install('mariadb-server')
    const mysqlServiceStatus = await service.status('mysql')
    if (!mysqlServiceStatus.enabled) {
      await service.enable('mysql')
    }
    if (mysqlServiceStatus.running) {
      await service.restart('mysql')
    } else {
      await service.start('mysql')
    }
    await mariadb.setUserPassword(rootUser, rootPassword)
  }
  const users = await mariadb.getUsers()
  const databases = await mariadb.getDatabases()
  if (users.indexOf(username) === -1) {
    await mariadb.createUser(username, password)
  }
  if (databases.indexOf(database) === -1) {
    await mariadb.createDatabase(database)
    await mariadb.grantPrivilegesToDatabase(username, database)
  } else if (users.indexOf(username) === -1) {
    await mariadb.grantPrivilegesToDatabase(username, database)
  }
}