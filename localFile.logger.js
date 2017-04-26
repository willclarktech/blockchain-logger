// @flow
/* eslint-disable immutable/no-mutation, immutable/no-this */
import fs from 'fs'
import { flatten } from 'lodash'
import Logger from './base.logger'
import type { Log, LoggerOptions } from './base.types'

type LocalFileLoggerOptions = LoggerOptions & {
  logPath: string,
  logFilePrefix: ?string,
}

class LocalFileLogger<D> extends Logger<D> {
  logPath: string
  logFilePrefix: string
  stream: stream$Writable & { path?: string }
  mostRecentHash: ?string

  constructor(options: LocalFileLoggerOptions): void {
    super(options)

    this.logPath = options.logPath
    this.logFilePrefix = options.logFilePrefix || 'logs'
    this.refreshStream()
  }

  async store(logString: string): Promise<boolean> {
    this.refreshStream()
    this.stream.write(`${logString}\n`)
    return true
  }

  async getLogs(n: ?number): Promise<Array<Log<D>>> {
    const logFiles = fs.readdirSync(this.logPath)
    const getLastLog = () => {
      const recentLogs = this.getLogsFromFile(logFiles[logFiles.length - 1])
      return recentLogs.slice(recentLogs.length - 1)
    }
    return n === 1
      ? getLastLog()
      : flatten(logFiles.map(this.getLogsFromFile.bind(this)))
        .slice(n || 0)
  }

  getLogFileName(): string {
    const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
    return `${this.logPath}${this.logFilePrefix}_${today}.log`
  }

  getLogsFromFile(file: string): Array<Log<D>> {
    return fs
      .readFileSync(`${this.logPath}${file}`, 'utf-8')
      .split('\n')
      .filter(log => !!log)
      .map(log => JSON.parse(log))
  }

  refreshStream(): void {
    const fileName = this.getLogFileName()
    const newStreamRequired = !this.stream || this.stream.path !== fileName
    if (newStreamRequired) {
      if (this.stream) {
        this.stream.end()
      }
      this.stream = fs.createWriteStream(fileName, { flags: 'a' })
    }
  }
}

export default LocalFileLogger
