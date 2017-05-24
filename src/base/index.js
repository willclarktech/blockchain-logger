// @flow
import crypto from 'crypto'
import type {
  Log,
  LogAggregator,
  LoggerOptions,
  LogWithoutHash,
} from './types'
import BlockchainLogger from '../blockchain'

class Logger<D> {
  blockchainLogger: ?BlockchainLogger
  genesisHash: string
  mostRecentHash: ?string
  getHashForLog: (log: LogWithoutHash<D>) => string

  constructor({
    genesisHash,
    blockchainOptions,
  }: LoggerOptions) {
    this.blockchainLogger = blockchainOptions
      ? new BlockchainLogger(blockchainOptions)
      : null
    this.genesisHash = genesisHash
    this.getHashForLog = (log: any): string =>
      crypto
        .createHash('sha256')
        .update(JSON.stringify(log), 'utf8')
        .digest('hex')
  }

  // eslint-disable-next-line no-unused-vars, class-methods-use-this
  async store(logString: string): Promise<boolean> {
    throw new Error('`store` method on Logger class should be overwritten by children.')
  }

  // eslint-disable-next-line no-unused-vars, class-methods-use-this
  async getLogs(n: ?number): Promise<Array<Log<D>>> {
    throw new Error('`getLogs` method on Logger class should be overwritten by children.')
  }

  async constructLogFromData(data: D): Promise<Log<D>> {
    const previousHash = await this.getMostRecentHash()
    const logWithoutHash = {
      data,
      meta: {
        timestamp: new Date(),
        previousHash,
      },
    }
    const hash = this.getHashForLog(logWithoutHash)
    return {
      ...logWithoutHash,
      hash,
    }
  }

  async getLoggedData(ensureHashConsistency: ?boolean): Promise<Array<D>> {
    return this.getLogs()
      .then(logs => ensureHashConsistency
        ? this.getConsistentLogs(logs)
        : logs,
      )
      .then(logs => logs
        .map(log => log.data)
        .filter(Boolean),
      )
  }

  async getConsistentLogs(logs: Array<Log<D>>): Promise<Array<Log<D>>> {
    const removeInconsistentLogs = (aggregator: LogAggregator, log: Log<D>): LogAggregator => {
      const { previousHash, validLogs } = aggregator
      const { hash, meta } = log
      return meta.previousHash === previousHash
        ? {
          previousHash: hash,
          validLogs: [...validLogs, log],
        }
        : aggregator
    }

    const initialLogAggregator = {
      previousHash: this.genesisHash,
      validLogs: [],
    }

    const validLogs = logs
      .reduce(removeInconsistentLogs, initialLogAggregator)
      .validLogs

    const enforceBlockchainHashes = (aggregator, log: Log<D>) => {
      const { validHashes, matchingLogs } = aggregator
      const hashIndex = validHashes.indexOf(log.hash)
      return hashIndex === -1
        ? aggregator
        : {
          validHashes: validHashes.slice(hashIndex + 1),
          matchingLogs: [...matchingLogs, log],
        }
    }

    return this.blockchainLogger
      ? this.blockchainLogger
        .getLogs()
        .then(validHashes => {
          const initialHashAggregator = { validHashes, matchingLogs: [] }
          return validLogs
            .reduce(enforceBlockchainHashes, initialHashAggregator)
        })
        .then(result => result.matchingLogs)
      : validLogs
  }

  async getMostRecentHash(): Promise<string> {
    return this.mostRecentHash
      || this.getLogs(1)
        .then(logs => {
          const l = logs.length
          const hash = l
            ? logs[l - 1].hash
            : this.genesisHash
          return this.setMostRecentHash(hash)
        })
  }

  async log(data: D): Promise<string> {
    const log = await this.constructLogFromData(data)
    const logString = JSON.stringify(log)
    return this.store(logString)
      .then(this.setMostRecentHash.bind(this, log.hash))
      .then(hash => this.blockchainLogger
        ? this.blockchainLogger
          .store(hash)
          .then(() => hash)
        : hash,
      )
  }

  setMostRecentHash(hash: string): string {
    this.mostRecentHash = hash
    return this.mostRecentHash
  }
}

export default Logger
