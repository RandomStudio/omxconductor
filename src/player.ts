// tslint:disable:ordered-imports
import fs from 'fs'
import path from 'path'
import {
  defaultOptions,
  CONTROL_CHECK_INTERVAL_MS,
  CONTROL_CHECK_MAX_ATTEMPTS,
} from './defaults'
import { exec } from 'child_process'
import { EventEmitter } from 'events'
import { userInfo } from 'os'

export enum AudioOutput {
  hdmi = 'hdmi',
  local = 'local',
  both = 'both',
}

enum PlayStatus {
  playing = 'Playing',
  paused = 'Paused',
}

export interface PlayerOptions {
  layer?: number
  dBusId?: string
  audioOutput?: AudioOutput
  backgroundColor?: string
  noBackgroundColor?: boolean
  loop?: boolean
}

export interface PlayerSettings {
  layer: number
  dBusId: string
  audioOutput: AudioOutput
  backgroundColor: string
  noBackgroundColor: boolean
  loop: boolean
  testModeOnly: boolean
  progressInterval: number
}

export class Player extends EventEmitter {
  private file: string
  private settings: PlayerSettings

  constructor(file: string, options?: PlayerOptions) {
    super()
    this.file = file
    this.settings = { ...defaultOptions, ...(options as PlayerSettings) }
  }

  getSettings = () => {
    return this.settings
  }

  enableTestMode = () => {
    this.settings.testModeOnly = true
  }

  waitForControl = () =>
    new Promise((resolve, reject) => {
      let attempts = 0
      const interval = setInterval(() => {
        attempts++
        getPlayStatus(this.settings.dBusId)
          .then((result) => {
            clearInterval(interval)
            resolve({ result, attempts })
          })
          .catch((err) => {
            if (attempts > CONTROL_CHECK_MAX_ATTEMPTS) {
              reject({ err, attempts })
            } // else ignore and try again
          })
      }, CONTROL_CHECK_INTERVAL_MS)
    })

  open = (waitOnBlack = false) =>
    new Promise((resolve, reject) => {
      const filePath = path.resolve(this.file)
      fs.stat(filePath, (err, stats) => {
        if (err) {
          reject({ filePath, err })
        } else {
          this.startOmxInstance(filePath)
            .then((command) => {
              this.emit('open', { filePath, command, playing: !waitOnBlack })
              this.waitForControl()
                .then((result) => {
                  this.emit('ready', result)
                  this.scheduleProgressCheck()
                })
                .catch((waitErr) => this.emit('error', waitErr))
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
            this.emit('close', { err, stdout, stderr })
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

  private scheduleProgressCheck = () => {
    setInterval(() => {
      let position: number
      let duration: number
      getFloat(this.settings.dBusId, 'Position')
        .then((value) => {
          position = value

          return getFloat(this.settings.dBusId, 'Duration')
        })
        .then((value) => {
          duration = value
          this.emit('progress', {
            position,
            duration,
            progress: position / duration,
          })
        })
        .catch((err) => this.emit('error', err))
    }, this.settings.progressInterval)
  }
} // --------- Class end ---------------------------------------------

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

interface ExecResult {
  stdout: string
  stderr: string
}

const execPromise = (command: string) =>
  new Promise<ExecResult>((resolve, reject) => {
    exec(command, (err, stdout, stderr) => {
      if (err) {
        reject(err)
      } else {
        resolve({ stdout, stderr })
      }
    })
  })

const dBusVars = () =>
  new Promise((resolve, reject) => {
    const USER = userInfo().username

    const OMXPLAYER_DBUS_ADDR = `/tmp/omxplayerdbus.${USER}`
    const OMXPLAYER_DBUS_PID = `/tmp/omxplayerdbus.${USER}.pid`

    execPromise(`cat ${OMXPLAYER_DBUS_ADDR}`)
      .then((resultAddr: ExecResult) => {
        const address = resultAddr.stdout
        execPromise(`cat ${OMXPLAYER_DBUS_PID}`)
          .then((resultPid: ExecResult) => {
            const pid = resultPid.stdout
            resolve(
              `DBUS_SESSION_BUS_ADDRESS=${address} DBUS_SESSION_BUS_PID=${pid}`
                .trim()
                .replace('\n', ' ')
            )
          })
          .catch((err) => reject(err))
      })
      .catch((err) => reject(err))
  })

const dbusCommand = (dbusId: string) =>
  `dbus-send --print-reply=literal --session --reply-timeout=${CONTROL_CHECK_INTERVAL_MS} --dest=${dbusId} /org/mpris/MediaPlayer2`

const getPlayStatus = (dbusId: string) =>
  new Promise<PlayStatus>((resolve, reject) => {
    dBusVars()
      .then((vars) => {
        execPromise(
          `${vars} ${dbusCommand(
            dbusId
          )} org.freedesktop.DBus.Properties.PlaybackStatus`
        )
          .then((result) =>
            resolve(
              result.stdout.trim() === 'Playing'
                ? PlayStatus.playing
                : PlayStatus.paused
            )
          )
          .catch((err) => reject(err))
      })
      .catch((err) => reject(err))
  })

const cleanDbusNumber = (res: string): number =>
  Number(
    res
      .trim()
      .replace('\n', '')
      .split(' ')[1]
  )

const getFloat = (dbusId: string, property: string) =>
  new Promise<number>((resolve, reject) => {
    dBusVars()
      .then((vars) => {
        execPromise(
          `${vars} ${dbusCommand(
            dbusId
          )} org.freedesktop.DBus.Properties.${property}`
        )
          .then((result) => resolve(cleanDbusNumber(result.stdout)))
          .catch((err) => reject(err))
      })
      .catch((err) => reject(err))
  })
