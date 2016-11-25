import {registerWrapper, setupContext} from '../wrappers'
import {createAptWrapper} from './createAptWrapper'

const ltsReleases = [
  '16.04',
  '18.08'
]

const supportedReleases = [
  '16.04',
  '16.10',
  '17.04'
]

export async function setupUbuntu(ctx) {
  const {distro, logger} = ctx
  if (supportedReleases.indexOf(distro.release) === -1) {
    throw new Error('We don\'t support this version of Ubuntu ' + distro.release)
  }
  if (ltsReleases.indexOf(distro.release) === -1) {
    logger.log(`We recommend you to use LTS version of Ubuntu for servers to receive security updates and bug fixes. You use [yellow:${distro.release}] version`.red)
  }

  registerWrapper('repo', createAptWrapper)
  setupContext(ctx)
  await ctx.repo.install('build-essential')
}