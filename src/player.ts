import fs from 'fs'
import path from 'path'
import { defaultOptions } from './defaults'
import { IS_DEV } from './environment'

export enum AudioOutput {
  hdmi = 'hdmi',
  local = 'local',
  both = 'both',
}

export interface PlayerOptions {
  layer?: number
  dBusId?: string
  audioOutput?: AudioOutput
  backgroundColor?: number
  noBackgroundColor?: boolean
  loop?: boolean
}

export class Player {
  private file: string
  private settings: PlayerOptions

  constructor(file: string, options?: PlayerOptions) {
    this.file = file
    this.settings = { ...defaultOptions, ...options }
  }

  getSettings = () => {
    return this.settings
  }

  open = (waitOnBlack = false) =>
    new Promise((resolve, reject) => {
      const filePath = path.resolve(this.file)
      fs.stat(filePath, (err, stats) => {
        if (err) {
          reject({ filePath, err })
        } else {
          if (IS_DEV) {
            resolve({ filePath, playing: !waitOnBlack })
          } else {
            this.startOmxInstance(filePath)
              .then(() => {
                resolve({ filePath, playing: !waitOnBlack })
              })
              .catch((startError) => {
                reject({ filePath, err: startError })
              })
          }
        }
      })
    })

  private startOmxInstance = (file: string) =>
    new Promise((resolve, reject) => {
      resolve(file)
    })
}
