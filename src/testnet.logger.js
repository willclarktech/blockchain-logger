// @flow
import client from 'axios'
import {
  ECPair,
  networks,
  script,
  TransactionBuilder,
} from 'bitcoinjs-lib'
import type {
  Axios,
} from 'axios'
import type {
  ECPair as ECPairType,
  Network,
  Transaction,
} from 'bitcoinjs-lib'
import Logger from './base.logger'
import type { LoggerOptions } from './base.types'

type PushTransactionResponse = {
  error: ?{ message: string },
}

type TestnetLoggerOptions = LoggerOptions & {
  privateKey: string,
  prefix: ?string,
}

class TestnetLogger<D> extends Logger<D> {
  client: Axios
  keyPair: ECPairType
  network: Network
  prefix: Buffer

  constructor(options: TestnetLoggerOptions): void {
    super(options)
    this.client = client
    this.network = networks.testnet
    this.keyPair = ECPair.fromWIF(options.privateKey, this.network)
    this.prefix = Buffer.from(options.prefix || 'BL')
  }

  async store(logString: string): Promise<boolean> {
    const data = Buffer.from(logString)
    const transaction = this.buildTransaction(data)
    return this.pushTransaction(transaction)
      .then(() => true)
  }

  buildTransaction(data: Buffer): Transaction {
    if (data.length > 80 - this.prefix.length) throw new Error('Data is too long to store via OP_RETURN.')
    const inputTxId = 'a14ee2d11031ef64ea80645f685bb8980d4584b98398b496988e9adf7e5d2540'
    const myAddress = this.keyPair.getAddress()
    const remainingBalance = 199990000
    const fee = 5000
    const outputAmount = remainingBalance - fee
    const opReturnData = Buffer.concat([this.prefix, data])
    // $FlowFixMe: flow-type defs out of date
    const opReturnAddress = script.nullData.output.encode(opReturnData)

    const tx = new TransactionBuilder(this.network)
    tx.addInput(inputTxId, 0)
    tx.addOutput(myAddress, outputAmount)
    tx.addOutput(opReturnAddress, 0)
    // $FlowFixMe: flow-type defs out of date
    tx.sign(0, this.keyPair)

    const built = tx.build()
    return built
  }

  async pushTransaction(transaction: Transaction): Promise<PushTransactionResponse> {
    return this.client.post(
      'https://testnet-api.smartbit.com.au/v1/blockchain/pushtx',
      { hex: transaction.toHex() },
    )
      .then(response => response.data, error => error.response.data)
  }
}

export default TestnetLogger
