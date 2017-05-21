import assert from 'assert'
import { TestnetLogger } from '../src'

const LOG = 'For good luck, I like my rhymes atrocious\nSupercalafragilisticexpialidocious'

const testnetLogger = new TestnetLogger({
  genesisHash: 'abc',
  privateKey: process.env.PRIVATE_KEY,
  prefix: 'BL',
})

const sanityCheck = () => assert.ok(testnetLogger)

const testStore = () =>
  testnetLogger
    .store(LOG)
    .then(assert.ok)

const testBuildTransaction = () => {
  assert.ok(
    testnetLogger.buildTransaction(Buffer.from(LOG)),
  )
  assert.throws(
    () => testnetLogger.buildTransaction(Buffer.alloc(79, 'A')),
    /Data is too long to store via OP_RETURN\./,
  )
}

const testPushTransaction = () => {
  const transaction = {
    toHex: () => '010000000135c9d4a79c820478e22e217f4af2fef05f552a6e877fcc3b7ac144a94398c1df000000006b483045022100dcb0ea8cf348dad8012a0ab2d213453a28a63c2765b0c84f01558f8a09545c7802200839998236316605967f1ca9ca06d012e27c20d89892b4c8eb80a76b2fec67a90121024e68ae959c2e5ea5930d7fb0b0b657237345002a2f796f3cb5c88ef169f7ae1fffffffff0118beeb0b0000000017a914a146a5852ae8b190efc5ef14813f040659291f9f8700000000',
  }
  return testnetLogger
    .pushTransaction(transaction)
    .then(responseData => assert.strictEqual(responseData.error.message, 'Missing inputs'))
}

Promise.all([
  sanityCheck(),
  testStore(),
  testBuildTransaction(),
  testPushTransaction(),
])
  .catch(console.error)
