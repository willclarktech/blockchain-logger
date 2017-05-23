// @flow
import type { LoggerOptions } from '../base/types'

export type TwitterGetStatusesResponse = Array<{
  id_str: string,
  extended_entities: {
    media: Array<{
      ext_alt_text: string,
    }>,
  },
}>

export type TwitterPostStatusResponse = {
  created_at: string,
}

export type TwitterUploadMediaResponse = {
  media_id_string: string,
}

type TwitterGetResponse
  = TwitterGetStatusesResponse

type TwitterPostResponse
  = TwitterPostStatusResponse
  | TwitterUploadMediaResponse

type TwitterResponse
  = TwitterGetResponse
  | TwitterPostResponse

export type TwitterClient = {
  get: (path: string, params: {}) => Promise<TwitterGetResponse>,
  post: (path: string, params: {}) => Promise<TwitterPostResponse>,
  request: (path: string, config: {}, callback: Function) => Promise<TwitterResponse>,
  options: {
    media_base: string,
    request_options: {},
  },
}

export type TwitterLoggerOptions = LoggerOptions & {
  accessTokenKey: string,
  accessTokenSecret: string,
  baseImageLocation: string,
  consumerKey: string,
  consumerSecret: string,
  screenName: string,
}
