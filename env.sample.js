const fs = require('fs')

module.exports = {
  servers: {
    app: {
      host: '0.0.0.0',
      port: 22,
      username: 'root',
      privateKey: fs.readFileSync('/some/path').toString()
    }
  },
  apps: {
    app: {
      kinds: ['nginx', 'node', 'mariadb'],
      apt: {
        repos: [],
        install: []
      },
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