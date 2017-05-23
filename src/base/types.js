// @flow
import type { TestnetLoggerOptions } from '../testnet/types'

export type LogWithoutHash<D> = {
  data: D,
  meta: {|
    timestamp: Date,
    previousHash: string,
  |},
}

export type Log<D> = LogWithoutHash<D> & {
  hash: string,
}

export type LogAggregator = {|
  previousHash: string,
  validLogs: Array<Log<any>>,
|}

export type LoggerOptions = {
  blockchainOptions: ?TestnetLoggerOptions,
  genesisHash: string,
  privateKey: ?string,
}
