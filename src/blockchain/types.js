// @flow
export type PushTransactionResponse = {
  error: ?{ message: string },
}

export type BlockchainLoggerOptions = {
  maxFee: ?number,
  prefix: ?string,
  privateKey: string,
  testnet: ?Boolean,
}
