// @flow
import axios from 'axios'
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
import type {
  PushTransactionResponse,
  TestnetLoggerOptions,
} from './testnet.types'

class TestnetLogger {
  client: Axios
  keyPair: ECPairType
  maxFee: ?number
  network: Network
  prefix: Buffer

  constructor(options: TestnetLoggerOptions): void {
    this.client = axios
    this.network = networks.testnet

    const {
      maxFee,
      prefix,
      privateKey,
    } = options

    this.maxFee = maxFee
    this.keyPair = ECPair.fromWIF(privateKey, this.network)
    this.prefix = Buffer.from(prefix || 'BL')
  }

  async store(logString: string): Promise<boolean> {
    const data = Buffer.from(logString)
    return this.buildTransaction(data)
      .then(this.pushTransaction.bind(this))
      .then(() => true)
  }

  async getFee(): Promise<number> {
    const medianTransactionSize = 226 // bytes
    const url = 'https://bitcoinfees.21.co/api/v1/fees/recommended'
    return this.client.get(url)
      .then(response => response.data.fastestFee * medianTransactionSize)
  }

  async getUnspentTransactions(): Promise<Array<Object>> {
    const base = 'https://testnet-api.smartbit.com.au/v1/blockchain/address'
    const address = this.keyPair.getAddress()
    const url = `${base}/${address}/unspent`
    return this.client.get(url)
      .then(response => response.data.unspent)
  }

  async buildTransaction(data: Buffer): Promise<Transaction> {
    if (data.length > 80 - this.prefix.length) throw new Error('Data is too long to store via OP_RETURN.')
    const myAddress = this.keyPair.getAddress()
    const transactions = await this.getUnspentTransactions()
    const unspent = transactions[0]
    const inputTxId = unspent.txid
    const remainingBalance = unspent.value_int
    const recommendedFee = await this.getFee()
    const fee = this.maxFee
      ? Math.min(recommendedFee, this.maxFee)
      : recommendedFee
    const outputAmount = remainingBalance - fee
    const opReturnData = Buffer.concat([this.prefix, data])
    // $FlowFixMe: flow-type defs out of date
    const opReturnAddress = script.nullData.output.encode(opReturnData)

    const tx = new TransactionBuilder(this.network)
    tx.addInput(inputTxId, unspent.n)
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
      .then(response => response.data)
  }
}

export default TestnetLogger
