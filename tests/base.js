// @flow
import assert from 'assert'
import { BaseLogger } from '../src'

const LOG = 'For good luck, I like my rhymes atrocious\nSupercalafragilisticexpialidocious'

const baseLogger = new BaseLogger({
  genesisHash: 'abc123',
  blockchainOptions: {
    maxFee: 5000,
    prefix: 'TESTING',
    privateKey: process.env.PRIVATE_KEY,
  },
})

baseLogger.getLogs = async () => [
  {
    data: 'heya',
    meta: {
      timestamp: '2017-05-01',
      previousHash: 'abc123',
    },
    hash: 'def456',
  },
  {
    data: 'whoops',
    meta: {
      timestamp: '1970-01-01',
      previousHash: 'dunno',
    },
    hash: 'evil',
  },
  {
    data: 'oh hey',
    meta: {
      timestamp: '2017-05-02',
      previousHash: 'def456',
    },
    hash: 'ghi789',
  },
]
baseLogger.store = async () => true

const checkSanity = () => assert.ok(baseLogger)

const testLog = () =>
  baseLogger.log(LOG)
    .then(assert.ok)

const testGetLoggedData = () =>
  baseLogger.getLoggedData(true)
    .then(logs => assert.deepStrictEqual(logs, []))

Promise.all([
  checkSanity(),
  testLog(),
  testGetLoggedData(),
])
