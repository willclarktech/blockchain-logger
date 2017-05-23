// @flow
import type { LoggerOptions } from '../base/types'

export type LocalFileLoggerOptions = LoggerOptions & {
  logPath: string,
  logFilePrefix: ?string,
}
