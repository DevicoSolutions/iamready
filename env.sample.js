const fs = require('fs')

module.exports = {
  servers: {
    app: {
      credentials: [{// You can setup many servers with one configuration
        host: '0.0.0.0',
        port: 22,
        username: 'root',
        privateKey: fs.readFileSync('/path/to/private/key').toString()
      }],
      kinds: ['nginx', 'node', 'mariadb'],
      config: {
        node: {
          version: 6
        },
        mariadb: {
          rootPassword: 'freeware',
          username: 'minorm2',
          password: 'freeware',
          database: 'minorm2_example'
        }
      },
    }
  },
  apps: {
    app: {
      port: 80,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        MYSQL_USER: 'app',
        MYSQL_PASS: 'freeware',
        MYSQL_DB: 'app'
      }
    }
  }
}