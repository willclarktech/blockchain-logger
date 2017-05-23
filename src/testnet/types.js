// @flow
export type PushTransactionResponse = {
  error: ?{ message: string },
}

export type TestnetLoggerOptions = {
  maxFee: ?number,
  prefix: ?string,
  privateKey: string,
}
