// @flow
import assert from 'assert'
import { BaseLogger } from '../src'

const LOG = 'For good luck, I like my rhymes atrocious\nSupercalafragilisticexpialidocious'

const baseLogger = new BaseLogger({
  genesisHash: 'abc',
  blockchainOptions: {
    maxFee: 5000,
    prefix: 'TESTING',
    privateKey: process.env.PRIVATE_KEY,
  },
})

baseLogger.getLogs = async () => []
baseLogger.store = async () => true

const checkSanity = () => assert.ok(baseLogger)

const testLog = () =>
  baseLogger.log(LOG)
    .then(assert.ok)

Promise.all([
  checkSanity(),
  testLog(),
])
