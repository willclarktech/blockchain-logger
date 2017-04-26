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

## Usage

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
