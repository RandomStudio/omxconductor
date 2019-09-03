// tslint:disable:ordered-imports
import fs from 'fs'
import path from 'path'
import { defaultOptions } from './defaults'
import { exec } from 'child_process'

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
  testModeOnly: boolean
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

  enableTestMode = () => {
    this.settings.testModeOnly = true
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
      if (this.settings.testModeOnly) {
        resolve({ command, testModeOnly: true })
      } else {
        exec(`mkfifo omxpipe${this.settings.layer}`, () => {
          // ignore errors, e.g. already exists
          exec(command, (err, stdout, stderr) => {
            // this block only executes when pipe is closed!
            // tslint:disable-next-line:no-console
            console.log('pipe closed', { err, stdout, stderr })
          })
          exec(`. > omxpipe${this.settings.layer}`, (err, stdout, stderr) => {
            if (err) {
              reject({ err, command })
            } else {
              resolve({ command, stdout, stderr, testModeOnly: false })
            }
          })
        })
      }
    })
}

const settingsToArgs = (file: string, settings: PlayerSettings): string[] => [
  `"${file}"`,
  '-o',
  settings.audioOutput,
  settings.noBackgroundColor ? '' : `-b${settings.backgroundColor}`,
  '--dbus_name',
  settings.dBusId,
  settings.loop ? '--loop' : '',
  '--layer',
  settings.layer.toString(),
]
