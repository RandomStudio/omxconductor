// tslint:disable:ordered-imports
import fs from 'fs/promises'
import path from 'path'
import {
  defaultOptions,
  CONTROL_CHECK_INTERVAL_MS,
  CONTROL_CHECK_MAX_ATTEMPTS,
} from './defaults'
import { exec } from 'child_process'
import { EventEmitter } from 'events'

import {
  getFloat,
  getPlayStatus,
  setPosition,
  millToMicro,
  pause,
  stop,
  resume,
  PlayStatus,
  execPromise,
} from './dbus'

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
  progressInterval: number
}

interface Trigger {
  positionMs: number
  handler: (triggeredPositionMs: number) => void
  alreadyTrigged: boolean
}

export class Player extends EventEmitter {
  private file: string
  private settings: PlayerSettings
  private positionTriggers: Trigger[]
  private disableProgressChecks: boolean
  private progressCheckIntervalTimer: NodeJS.Timer | null

  constructor(file: string, options?: PlayerOptions) {
    super()
    this.file = file
    this.settings = { ...defaultOptions, ...(options as PlayerSettings) }
    this.positionTriggers = []
    this.disableProgressChecks = false
    this.progressCheckIntervalTimer = null
  }

  getSettings = () => {
    return this.settings
  }

  enableTestMode = () => {
    this.settings.testModeOnly = true
  }

  waitForControl = async (): Promise<{
    result: PlayStatus
    attemptsLeft: number
  }> =>
    new Promise((resolve, reject) => {
      let attemptsLeft = CONTROL_CHECK_MAX_ATTEMPTS

      const interval = setInterval(async () => {
        attemptsLeft--
        try {
          const result = await getPlayStatus(this.settings.dBusId)
          clearInterval(interval)
          resolve({ result, attemptsLeft })
        } catch (err) {
          if (attemptsLeft <= 0) {
            clearInterval(interval)
            reject({ err, attemptsLeft })
          } // else ignore, try again
        }
      }, CONTROL_CHECK_INTERVAL_MS)
    })

  open = async (
    waitOnBlack = false
  ): Promise<{ filePath: string; command: string; playing: boolean }> => {
    const filePath = path.resolve(this.file)
    try {
      await fs.access(filePath)
      const { command } = await this.startOmxInstance(filePath)
      const result = await this.waitForControl()
      this.emit('ready', result)
      this.scheduleProgressCheck()
      return { filePath, command, playing: !waitOnBlack }
    } catch (accessError) {
      throw Error('error accessing file or does not exist: ' + accessError)
    }
  }

  getIsPlaying = async () => {
    const status = await getPlayStatus(this.settings.dBusId)
    return status === PlayStatus.playing
  }

  seekAbsolute = async (positionMs: number, callback?: () => void) => {
    setPosition(this.settings.dBusId, positionMs)
      .then(() => {
        if (callback) {
          callback()
        }
      })
      .catch((err) => this.emit('error', err))
  }

  pause = async () => {
    await pause(this.settings.dBusId)
    this.emit('paused')
  }

  stop = async () => {
    this.stopProgressCheck()
    await stop(this.settings.dBusId)
    this.emit('stopped')
  }

  resume = async () => {
    await resume(this.settings.dBusId)
    this.emit('resumed')
  }

  registerPositionTrigger = (
    positionMs: number,
    handler: (triggeredPositionMs: number) => void
  ) => {
    this.positionTriggers.push({
      positionMs,
      handler,
      alreadyTrigged: false,
    })
  }

  private startOmxInstance = async (
    file: string
  ): Promise<{
    command: string
    stdout?: string
    stderr?: string
    testModeOnly: boolean
  }> => {
    const command = `omxplayer ${settingsToArgs(file, this.settings).join(
      ' '
    )} < omxpipe${this.settings.layer}`

    if (this.settings.testModeOnly) {
      return { command, testModeOnly: true }
    } else {
      try {
        await execPromise(`mkfifo omxpipe${this.settings.layer}`)
      } catch (e) {
        // ignore errors, e.g. already exists
      }

      exec(command, (err, stdout, stderr) => {
        // this block only executes when pipe is closed!
        this.stopProgressCheck()
        this.emit('close', { err, stdout, stderr })
      })

      const result = await execPromise(`. > omxpipe${this.settings.layer}`)
      return {
        command,
        stdout: result.stdout,
        stderr: result.stderr,
        testModeOnly: false,
      }
    }
  }

  private progressCheck = async (): Promise<void> => {
    if (this.disableProgressChecks) {
      return
    }

    try {
      const position = await getFloat(this.settings.dBusId, 'Position')
      const duration = await getFloat(this.settings.dBusId, 'Duration')

      if (this.positionTriggers.length > 0) {
        this.positionTriggers.forEach((trigger) => {
          if (
            position / millToMicro >= trigger.positionMs &&
            !trigger.alreadyTrigged
          ) {
            trigger.handler(position / millToMicro)
            trigger.alreadyTrigged = true
          }
          if (
            position / millToMicro < trigger.positionMs &&
            trigger.alreadyTrigged
          ) {
            trigger.alreadyTrigged = false // reset
          }
        })
      }
      this.emit('progress', {
        position,
        duration,
        progress: position / duration,
      })
    } catch (e) {
      console.warn('ignoring error in progress check; clip already stopped?')
    }
  }

  private scheduleProgressCheck = () => {
    this.progressCheckIntervalTimer = setInterval(
      this.progressCheck,
      this.settings.progressInterval
    )
  }

  private stopProgressCheck = () => {
    this.disableProgressChecks = true
    if (this.progressCheckIntervalTimer !== null) {
      clearInterval(this.progressCheckIntervalTimer)
    }
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
