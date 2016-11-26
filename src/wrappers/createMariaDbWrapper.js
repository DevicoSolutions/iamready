/** @flow */
import type {SetupContext, MariaDbContext} from '../types'

export function createMariaDbWrapper(ctx: SetupContext): MariaDbContext {
  const {logger, ssh, config} = ctx
  const mariaLogger = logger.createSubLogger(`[[blue:MariaDb]]`)
  const mariadbadmin = ssh.wrapCommand('mysqladmin', {
    sudo: true,
    env: {
      DEBIAN_FRONTEND: 'noninteractive'
    }
  }, false)
  const mariadb = ssh.wrapCommand('mysql', {
    env: {
      DEBIAN_FRONTEND: 'noninteractive'
    }
  }, false)
  const {rootUser = 'root', rootPassword, username, password, database} = config.config.mariadb

  async function querySudo(sql) {
    try {
      return await mariadb.sudo(`-u${rootUser} -p${rootPassword} -e "${sql}"`)
    } catch (err) {
      throw err
    }
  }

  async function query(sql) {
    try {
      return await mariadb.sudo(`-u${username} -p${password} -D${database} -e "${sql}"`)
    } catch (err) {
      throw err
    }
  }

  return {
    setUserPassword(username, newPassword) {
      return mariaLogger.waitFor(
        `Setting [yellow:${username}] password`,
        mariadbadmin('-u' + username + ' password ' + newPassword),
        `Password for [yellow:${username}] changed`
      )
    },
    createUser(username, password) {
      return mariaLogger.waitFor(
        `Creation user [yellow:${username}]`,
        querySudo(`CREATE USER '${username}'@'localhost' IDENTIFIED BY '${password}';`), `User created [yellow:${username}]`
      )
    },
    createDatabase(database) {
      return mariaLogger.waitFor(
        `Creation database [yellow:${database}]`,
        querySudo(`CREATE DATABASE ${database} CHARACTER SET utf8 COLLATE utf8_general_ci;`), `Database created [yellow:${database}]`
      )
    },
    async grantPrivilegesToDatabase(username, database) {
      await mariaLogger.waitFor(
        'Granting privileges to database [yellow:${database}]',
        querySudo(`GRANT ALL ON ${database}.* TO '${username}'@'localhost';`)
      )
      await mariaLogger.waitFor(
        'Flushing privileges',
        querySudo(`FLUSH PRIVILEGES;`)
      )
    },
    async getUsers() {
      const {stdout} = await querySudo('SELECT User FROM mysql.user;')
      return stdout.split('\n')
        .filter(line => line.indexOf('--') === -1 && line.indexOf(' User ') === -1)
        .map(user => user.replace(/\|/g, '').trim())
    },
    async getDatabases() {
      const {stdout} = await querySudo('SHOW DATABASES;')
      return stdout.split('\n')
        .filter(line => line.indexOf('--') === -1 && line.indexOf(' Database ') === -1)
        .map(user => user.replace(/\|/g, '').trim())
    }
  }
}