// tslint:disable:ordered-imports
import { userInfo } from 'os'
import { exec } from 'child_process'
import { CONTROL_CHECK_INTERVAL_MS } from './defaults'

export enum PlayStatus {
  playing = 'Playing',
  paused = 'Paused',
}

interface ExecResult {
  stdout: string
  stderr: string
}

export const dBusVars = () =>
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

export const getPlayStatus = (dbusId: string) =>
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

export const getFloat = (dbusId: string, property: string) =>
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
