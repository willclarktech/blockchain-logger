// @flow
import fs from 'fs'
import Client from 'twitter'
import _get from 'lodash/get'
import Logger from '../base'
import type { Log, LoggerOptions } from '../base/types'
import type {
  TwitterClient,
  TwitterGetStatusesResponse,
  TwitterPostStatusResponse,
  TwitterUploadMediaResponse,
} from './types'

const ensureExternalApiResponseShape = (path: string | Array<string>) => <R>(response: R): R => {
  if (!_get(response, path, null)) {
    const pathString = typeof path === 'string'
      ? path
      : path.join('.')
    throw new Error(`External API response falsy at path: ${pathString}.`)
  }
  return response
}

type TwitterLoggerOptions = LoggerOptions & {
  accessTokenKey: string,
  accessTokenSecret: string,
  baseImageLocation: string,
  consumerKey: string,
  consumerSecret: string,
  screenName: string,
}

class TwitterLogger<D> extends Logger<D> {
  maxPageSize: number
  screenName: string
  mostRecentHash: ?string
  baseImage: Buffer
  client: TwitterClient

  constructor(options: TwitterLoggerOptions): void {
    super(options)

    const {
      accessTokenKey,
      accessTokenSecret,
      baseImageLocation,
      consumerKey,
      consumerSecret,
      screenName,
    } = options

    this.maxPageSize = 200 // https://dev.twitter.com/rest/reference/get/statuses/user_timeline
    this.screenName = screenName
    this.baseImage = fs.readFileSync(baseImageLocation)

    this.client = new Client({
      access_token_key: accessTokenKey,
      access_token_secret: accessTokenSecret,
      consumer_key: consumerKey,
      consumer_secret: consumerSecret,
    })
  }

  async store(logString: string): Promise<boolean> {
    return this.uploadMedia(this.baseImage)
      .then(this.setAltTextOnMedia.bind(this, logString))
      .then(this.postStatusWithMedia.bind(this))
      .then(() => true)
  }

  getLogs(n: ?number): Promise<Array<Log<D>>> {
    const getAltTextFromTweetMedia = tweet =>
      _get(tweet, ['extended_entities', 'media', 0, 'ext_alt_text'], null)
    const getJSONLogs = (altText: ?string) => {
      if (!altText) {
        return null
      }
      try {
        return JSON.parse(altText)
      } catch (error) {
        return null
      }
    }

    return this
      .getTweets(n)
      .then(tweets => tweets
        .map(getAltTextFromTweetMedia)
        .map(getJSONLogs)
        .filter(Boolean)
        .reverse(),
      )
  }

  async getTweets(n: ?number): Promise<TwitterGetStatusesResponse> {
    const count = n
      ? Math.min(n, this.maxPageSize)
      : this.maxPageSize

    const defaultOptions = {
      screen_name: this.screenName,
      trim_user: true,
      exclude_replies: true,
      include_ext_alt_text: true,
      count,
    }

    const processResponse = async response =>
      response.length !== 0
        ? ensureExternalApiResponseShape(['0', 'extended_entities'])(response)
        : response

    const getMoreTweets = async (currentTweets: TwitterGetStatusesResponse) => {
      const l = currentTweets.length
      const maxId = l
        ? currentTweets[l - 1].id_str
        : null

      const options = maxId
        ? {
          ...defaultOptions,
          max_id: maxId,
        }
        : defaultOptions

      return this.client
        .get('statuses/user_timeline', options)
        .then(processResponse)
        .then(newTweets => {
          const tweetsToAdd = maxId
            ? newTweets.slice(1)
            : newTweets
          const tweets = [...currentTweets, ...tweetsToAdd]
          return tweetsToAdd.length && (!n || n > tweets.length)
            ? getMoreTweets(tweets)
            : tweets
        })
    }

    return getMoreTweets([])
  }

  postStatusWithMedia({
    media_id_string: mediaIdString,
  // $FlowFixMe: shape is enforced with helper function
  }: TwitterUploadMediaResponse): Promise<TwitterPostStatusResponse> {
    const tweet = {
      media_ids: mediaIdString,
      status: 'lol jk',
      trim_user: true,
    }
    return this.client
      .post('statuses/update', tweet)
      .then(ensureExternalApiResponseShape('created_at'))
  }

  setAltTextOnMedia(
    text: string,
    response: TwitterUploadMediaResponse,
  ): Promise<TwitterUploadMediaResponse> {
    const { options } = this.client
    const requestOptions = options.request_options

    const uri = `${options.media_base}/media/metadata/create.json`
    const update = {
      media_id: response.media_id_string,
      alt_text: { text },
    }
    const config = {
      ...requestOptions,
      method: 'post',
      body: JSON.stringify(update),
    }

    // TODO: switch to .post when fixed
    // See https://github.com/desmondmorris/node-twitter/issues/217
    return new Promise((resolve, reject) =>
      this.client
        .request(uri, config, (error, res) =>
          error
            ? reject(error)
            : res.statusCode === 200
              ? resolve(response)
              : reject(`${res.statusCode}: ${res.statusMessage}`),
        ),
      )
  }

  // $FlowFixMe: shape is enforced with helper function
  uploadMedia(media: Buffer): Promise<TwitterUploadMediaResponse> {
    return this.client
      .post('media/upload', { media })
      .then(ensureExternalApiResponseShape('media_id_string'))
  }
}

export default TwitterLogger
