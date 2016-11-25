
export async function configureNginx({repo, service, distro, config}) {
  if (distro.name === 'Ubuntu') {
    await repo.addRepository('ppa:nginx/stable') // Latest version for Ubuntu
  }
  const nginxInfo = await repo.getInfo('nginx')
  if (!nginxInfo.installed) {
    await repo.update()
    await repo.install('nginx')
  }
  const nginxServiceStatus = await service.status('nginx')
  if (!nginxServiceStatus.enabled) {
    await service.enable('nginx')
  }
  if (nginxServiceStatus.running) {
    await service.restart('nginx')
  } else {
    await service.start('nginx')
  }
}