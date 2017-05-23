# blockchain-logger

![logs](http://www.publicdomainpictures.net/pictures/140000/velka/firewood-background-1443615932MR7.jpg)

This project provides loggers which implement a basic blockchain structure. Data is put into the following block format and stored according to the chosen strategy:

```json
{
  "data": "your data here",
  "meta": {
    "timestamp": "when it was created",
    "previousHash": "a sha256 hash of the previous block"
  },
  "hash": "a sha256 hash of this block’s contents"
}
```

## Installation

```sh
yarn add blockchain-logger # or npm install blockchain-logger
```

## Local file and Twitter loggers

### Local file logger

This will store logs in date-stamped files in the directory of your choice.

```js
import { LocalFileLogger } from 'blockchain-logger'

const logger = new LocalFileLogger({
  genesisHash: 'abc123',
  logPath: './logs/',
  logFilePrefix: 'actions',
})
```

### Twitter logger

This will store logs in the alt-text of an image you repeatedly upload to your Twitter account. See [@tweetblockchain](https://twitter.com/tweetblockchain) for an example. (Click on an image for gallery view, and then inspect element to see the alt-text.)

```js
import { TwitterLogger } from 'blockchain-logger'

const logger = new TwitterLogger({
    accessTokenKey: 'get-this-from-twitter',
    accessTokenSecret: 'get-this-from-twitter',
    baseImageLocation: './path/to/some/media/file.jpg',
    consumerKey: 'get-this-from-twitter',
    consumerSecret: 'get-this-from-twitter',
    genesisHash: 'abc123',
    screenName: '@handle',
  })
}
```

### Log something

```js
const data = { whatever: 'you want' }
logger.log(data)
```

### Retrieve logs

```js
const ensureHashConsistency = true
logger.getLoggedData(ensureHashConsistency)
```

## Testnet logger

There’s also a logger for the [Bitcoin Testnet](https://en.bitcoin.it/wiki/Testnet). This stores data in transactions with an [`OP_RETURN`](https://en.bitcoin.it/wiki/OP_RETURN) output. Since the length of data that can be stored in such a transaction is limited to 80 bytes, this logger does not provide the blockchain properties of the other loggers, but could be used in conjunction with them to ensure integrity by storing hashes in a decentralised database (albeit only the Testnet currently).

### Create a Testnet logger

```js
import { TestnetLogger } from 'blockchain-logger'

const logger = new TestnetLogger({
  maxFee: 5000, // satoshis
  prefix: 'BL', // prepended to everything you log (uses up characters!)
  privateKey: 'generate-this-using-secure-tools',
})
```

The private key is needed to sign the transactions created to store logs in `OP_RETURN` outputs. The transaction sends 0 satoshis to the `OP_RETURN` script, and the rest back to the input address, minus a mining fee.

The logger uses [21.co’s recommended fees](https://bitcoinfees.21.co/) to calculate what fee to pay for the logging transaction, but you can set a limit with `maxFee`.

### Log something

```js
logger.store('some text')
logger.store(Buffer.from('some arbitrary data'))
```

The limit is 80 bytes minus the length of your prefix (if you provided one).

### Retrieve logs

```js
logger.getLogs()
```

This returns an array of strings of text that has been stored using `OP_RETURN` transactions for the specified address, which include the prefix (if you provided one). The prefix is stripped off.
