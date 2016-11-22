
const ltsReleases = [
  '16.04',
  '18.08'
]

const supportedReleases = [
  '16.04',
  '16.10',
  '17.04'
]

export async function setupUbuntu(distro, ssh) {
  console.log(`Found ${distro.name} ${distro.release}`)
  if (supportedReleases.indexOf(distro.release) === -1) {
    throw new Error('We don\'t support this version of Ubuntu')
  }
  if (ltsReleases.indexOf(distro.release) === -1) {
    console.log(`We recommend you to use LTS version of Ubuntu for servers to receive security updates and bug fixes. You use ${distro.release} version`)
  }
  console.log('Add nginx repo')
  try {
    await ssh.execute('add-apt-repository ppa:nginx/stable -y')
  } catch (err) {
    // For some reason it's fires exception there
    console.log('Nginx repo added')
  }
  console.log('Check updates and make upgrade')
  const output = await ssh.execute('apt-get update -y')
  console.log(output)
  console.log(await ssh.execute('apt-get upgrade -y'))
  console.log('nginx installation')
  console.log(await ssh.execute('apt-get install nginx -y'))
  try {
    console.log(await ssh.execute('systemctl enable nginx'))
  } catch (err) {}
  try {
    console.log(await ssh.execute('systemctl start nginx'))
  } catch (err) {}
  console.log('setup commonly used applications')
  console.log(await ssh.execute('DEBIAN_FRONTEND=noninteractive apt-get install vim git mc htop mariadb-server -y'))
}