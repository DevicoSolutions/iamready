import cli from 'cli'

cli.parse(
  {
    config: ['c', 'Config file', 'file', 'env.json']
  },
  [
    'setup',
    'start',
    'stop',
    'deploy'
  ]
)

cli.main(async (args, options) => {
  switch(cli.command) {
    case 'setup':
      
      break
  }
})