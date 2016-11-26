/** @flow */

export type ShellResponse = {
  stdout: string,
  stderr: string,
  code: number,
  signal: ?string
}

export type PackageInfo = {
  name?: string,
  version?: string,
  arch?: string,
  description?: string,
  installed: boolean
}

export type SetupRepoContext = {
  install(packages: string): Promise<ShellResponse>,
  addRepository(repo: string): Promise<ShellResponse>,
  update(): Promise<ShellResponse>,
  upgrade(): Promise<ShellResponse>,
  remove(packages: string): Promise<ShellResponse>,
  getInfo(packageName: string): Promise<PackageInfo>,
  purge(packages: string): Promise<ShellResponse>
}

export type Logger = {
  log(text: string): void,
  waitFor(waitingText: string, promise: Promise<*>, onSuccess?: string, onFail?: string): Promise<*>,
  createSubLogger(prefix: string): Logger
}

export type ExecOptions = {
  sudo?: boolean,
  env?: {[key: string]: string},
  pty?: Object,
  cwd?: string,
  stdin?: string,
  methods?: Array<string>
}

export type Command = {
  (): Promise<ShellResponse>,
  sudo(...options: Array<any>): Promise<ShellResponse>,
  [key: string]: Command
}

export type SshContext = {
  isReady(): boolean,
  ready(): Promise<any>,
  execute(text: string, options: ExecOptions): Promise<string>,
  execCommand(...options: Array<any>): Promise<ShellResponse>,
  end(): void,
  wrapCommand(command: string, defaultOptions: ExecOptions, inject?: boolean): Command,
  cat: Command,
  ls: Command,
  rm: Command,
  mkdir: Command,
  cd: Command,
  echo: Command,
  source: Command,
  which: Command,
  wget: Command,
  git: Command,
  sh: Command
}

export type MariaDbContext = {
  setUserPassword(username: string, newPassword: string): Promise<ShellResponse>,
  createUser(username: string, password: string): Promise<ShellResponse>,
  createDatabase(database: string): Promise<ShellResponse>,
  grantPrivilegesToDatabase(username: string, database: string): Promise<void>,
  getUsers(): Promise<Array<string>>,
  getDatabases(): Promise<Array<string>>
}

export type NodeContext = {
  installNvm(): Promise<ShellResponse>,
  install(version: string | number): Promise<ShellResponse>,
  setDefaultNode(version: string | number): Promise<ShellResponse>,
  getNodeDir(version: string | number): Promise<string>,
  registerInPath(nodeDir: string): Promise<boolean>
}

export type ServiceStatus = {
  name: string,
  description: string,
  loaded: boolean,
  path: string,
  enabled: boolean,
  active: boolean,
  running: boolean,
  startDate: Date
}

export type ServiceContext = {
  enable(service: string): Promise<ShellResponse>,
  disable(serive: string): Promise<ShellResponse>,
  start(service: string): Promise<ShellResponse>,
  status(service: string): Promise<ServiceStatus>,
  stop(service: string): Promise<ShellResponse>,
  restart(service: string): Promise<ShellResponse>
}

export type DistroContext = {
  name: string,
  release: string,
  codeName: string
}

export type SetupContext = {
  repo: SetupRepoContext,
  logger: Logger,
  ssh: SshContext,
  config: {[key: string]: any},
  mariadb: MariaDbContext,
  node: NodeContext,
  service: ServiceContext,
  distro: DistroContext
}