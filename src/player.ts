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
                .then((result) => this.emit('ready', result))
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

const getPlayStatus = (dbusId: string) =>
  new Promise((resolve, reject) => {
    dBusVars()
      .then((vars) => {
        const command = `${vars} dbus-send --print-reply=literal --session --reply-timeout=${CONTROL_CHECK_INTERVAL_MS} --dest=${dbusId} /org/mpris/MediaPlayer2 org.freedesktop.DBus.Properties.PlaybackStatus`
        execPromise(command)
          .then((result) => resolve(result.stdout.trim()))
          .catch((err) => reject(err))
      })
      .catch((err) => reject(err))
  })
