// @flow
import axios from 'axios'
import {
  ECPair,
  networks,
  script,
  TransactionBuilder,
} from 'bitcoinjs-lib'
import type { Axios } from 'axios'
import type {
  ECPair as ECPairType,
  Network,
  Transaction,
} from 'bitcoinjs-lib'
import type {
  PushTransactionResponse,
  TestnetLoggerOptions,
} from './types'

const RECOMMENDED_FEES_URL = 'https://bitcoinfees.21.co/api/v1/fees/recommended'
const SMARBIT_BASE_URL = 'https://testnet-api.smartbit.com.au/v1/blockchain'
const SMARTBIT_ENDPOINT_ADDRESS = 'address'
const SMARTBIT_ENDPOINT_OP_RETURNS = 'op-returns'
const SMARTBIT_ENDPOINT_PUSHTX = 'pushtx'
const SMARTBIT_ENDPOINT_UNSPENT = 'unspent'
const SMARTBIT_MAX_LIMIT = 1000

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
    this.prefix = Buffer.from(prefix || '')
  }

  async store(logString: string | Buffer): Promise<boolean> {
    const data = Buffer.from(logString)
    return this.buildTransaction(data)
      .then(this.pushTransaction.bind(this))
      .then(() => true)
  }

  async getLogs(n: ?number): Promise<Array<string>> {
    const address = this.keyPair.getAddress()
    const limit = `&limit=${n || SMARTBIT_MAX_LIMIT}`
    const initialUrl = `${SMARBIT_BASE_URL}/${SMARTBIT_ENDPOINT_ADDRESS}/${address}/${SMARTBIT_ENDPOINT_OP_RETURNS}?dir=asc${limit}`
    const getOpReturns = url =>
      this.client
        .get(url)
        .then(response => {
          const { op_returns: opReturns, paging } = response.data
          return paging.next
            ? getOpReturns(`${initialUrl}&next=${paging.next}`)
              .then(moreOpReturns => [...opReturns, ...moreOpReturns])
            : opReturns
        })

    return getOpReturns(initialUrl)
      .then(transactions => transactions.map(tx => tx.op_return.text))
      .then(this.getLogsFromOpReturnTexts.bind(this))
  }

  getLogsFromOpReturnTexts(texts: Array<string>): Array<string> {
    const regex = new RegExp(`^${this.prefix.toString()}`)
    const startIndex = this.prefix.length
    return texts
      .filter(text => text.match(regex))
      .map(text => text.slice(startIndex))
  }

  async getRecommendedFee(): Promise<number> {
    const medianTransactionSize = 226 // bytes
    return this.client.get(RECOMMENDED_FEES_URL)
      .then(response => response.data.fastestFee * medianTransactionSize)
  }

  async getUnspentTransactions(): Promise<Array<Object>> {
    const address = this.keyPair.getAddress()
    const url = `${SMARBIT_BASE_URL}/${SMARTBIT_ENDPOINT_ADDRESS}/${address}/${SMARTBIT_ENDPOINT_UNSPENT}`
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
    const recommendedFee = await this.getRecommendedFee()
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
    const url = `${SMARBIT_BASE_URL}/${SMARTBIT_ENDPOINT_PUSHTX}`
    return this.client.post(
      url,
      { hex: transaction.toHex() },
    )
      .then(response => response.data)
  }
}

export default TestnetLogger
