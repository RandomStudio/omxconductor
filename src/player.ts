import fs from 'fs'
import path from 'path'
import { defaultOptions } from './defaults'

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

export interface PlayerSettings {
  layer: number
  dBusId: string
  audioOutput: AudioOutput
  backgroundColor: number
  noBackgroundColor: boolean
  loop: boolean
}

export class Player {
  private file: string
  private settings: PlayerSettings

  constructor(file: string, options?: PlayerOptions) {
    this.file = file
    this.settings = { ...defaultOptions, ...(options as PlayerSettings) }
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
          this.startOmxInstance(filePath)
            .then((command) => {
              resolve({ filePath, command, playing: !waitOnBlack })
            })
            .catch((startError) => {
              reject({ filePath, err: startError })
            })
        }
      })
    })

  private startOmxInstance = (file: string) =>
    new Promise((resolve, reject) => {
      const command = `omxplayer ${settingsToArgs(file, this.settings).join(
        ' '
      )} < omxpipe${this.settings.layer}`
      resolve(command)
    })
}

const settingsToArgs = (file: string, settings: PlayerSettings): string[] => [
  `"${file}"`,
  '-o',
  settings.audioOutput,
  settings.noBackgroundColor ? '' : `-b${settings.backgroundColor}`,
  '--dbus-name',
  settings.dBusId,
  settings.loop ? '--loop' : '',
  '--layer',
  settings.layer.toString(),
]
