import Logger from '../utils/logger'

const versionOutputRegex = new RegExp('[\\w]+[\\s]+([\\w\\-\\.]+)[\\s]+([\\w\\:\\.\\d\\+\\-]+)[\\s]+([\\w\\d]+)[\\s]+([\\w\\d\\-\\.\\:\\s\\,]+)')

export function createMariaDbWrapper(ssh, app) {

  const {rootUser = 'root', rootPassword, username, password, database} = app.config.mariadb

  async function execute(tool, command, argument = null) {
    try {
      return await ssh.execute(`DEBIAN_FRONTEND=noninteractive ${tool} ${command} ${argument || ""}`)
    } catch (err) {
      throw err
    }
  }

  async function query(sql) {
    try {
      return await ssh.execute(`DEBIAN_FRONTEND=noninteractive mysql -u${rootUser} -p${rootPassword} -e "${sql}"`)
    } catch (err) {
      throw err
    }
  }

  return {
    setUserPassword(username, newPassword) {
      return Logger.waitFor(`[[green:MariaDb]] Setting [yellow:${username}] password`, execute('mysqladmin', '-u' + username + ' password', newPassword), `[[green:MariaDb]] Password for [yellow:${username}] changed`)
    },
    createUser(username, password) {
      return Logger.waitFor(`[[green:MariaDb]] Creation user [yellow:${username}]`, query(`CREATE USER '${username}'@'localhost' IDENTIFIED BY '${password}';`), `[[green:MariaDb]] User created [yellow:${username}]`)
    },
    createDatabase(database) {
      return Logger.waitFor(`[[green:MariaDb]] Creation database [yellow:${database}]`, query(`CREATE DATABASE ${database} CHARACTER SET utf8 COLLATE utf8_general_ci;`), `[[green:MariaDb]] Database created [yellow:${database}]`)
    },
    async grantPrivilegesToDatabase(username, database) {
      await Logger.waitFor('[[green:MariaDb]] Granting privileges to database [yellow:${database}]', query(`GRANT ALL ON ${database}.* TO '${username}'@'localhost';`))
      await Logger.waitFor('[[green:MariaDb]] Flushing privileges', query(`FLUSH PRIVILEGES;`))
    }
  }
}