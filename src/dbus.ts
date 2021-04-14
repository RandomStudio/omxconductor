// tslint:disable:ordered-imports
import { userInfo } from "os";
import { exec } from "child_process";
import { CONTROL_CHECK_INTERVAL_MS } from "./defaults";

export enum PlayStatus {
  playing = "Playing",
  paused = "Paused",
}

interface ExecResult {
  stdout: string;
  stderr: string;
}

// TODO: this should be memoized...
export const dBusVars = async (): Promise<string> => {
  const USER = userInfo().username;

  const OMXPLAYER_DBUS_ADDR = `/tmp/omxplayerdbus.${USER}`;
  const OMXPLAYER_DBUS_PID = `/tmp/omxplayerdbus.${USER}.pid`;

  const resultAddress: ExecResult = await execPromise(
    `cat ${OMXPLAYER_DBUS_ADDR}`
  );
  const address = resultAddress.stdout;

  const resultPid = await execPromise(`cat ${OMXPLAYER_DBUS_PID}`);
  const pid = resultPid.stdout;

  return `DBUS_SESSION_BUS_ADDRESS=${address} DBUS_SESSION_BUS_PID=${pid}`
    .trim()
    .replace("\n", " ");
};

const dBusProperty = (dbusId: string, property: string) =>
  `dbus-send --print-reply=literal --session --reply-timeout=${CONTROL_CHECK_INTERVAL_MS} --dest=${dbusId} /org/mpris/MediaPlayer2 org.freedesktop.DBus.Properties.${property}`;

const dBusMethod = (dbusId: string, method: string) =>
  `dbus-send --print-reply=literal --session --dest=${dbusId} /org/mpris/MediaPlayer2 org.mpris.MediaPlayer2.Player.${method}`;

export const getPlayStatus = async (dbusId: string) => {
  const result = await execPromise(
    `${await dBusVars()} ${dBusProperty(dbusId, "PlaybackStatus")}`
  );

  return result.stdout.trim() === "Playing"
    ? PlayStatus.playing
    : PlayStatus.paused;
};

const cleanDbusNumber = (res: string): number =>
  Number(res.trim().replace("\n", "").split(" ")[1]);

export const getFloat = async (
  dbusId: string,
  property: string
): Promise<number> => {
  const result = await execPromise(
    `${await dBusVars()} ${dBusProperty(dbusId, property)}`
  );
  return cleanDbusNumber(result.stdout);
};

export const millToMicro = 1000;

export const setPosition = async (dbusId: string, positionMs: number) =>
  execPromise(
    `${await dBusVars()} ${dBusMethod(
      dbusId,
      "SetPosition"
    )} objpath:/not/used int64:${positionMs / millToMicro} >/dev/null`
  );

export const pause = async (dbusId: string) =>
  execPromise(`${await dBusVars()} ${dBusMethod(dbusId, "Pause")} >/dev/null`);

export const stop = async (dbusId: string) =>
  execPromise(`${await dBusVars()} ${dBusMethod(dbusId, "Stop")} >/dev/null`);

export const resume = async (dbusId: string) =>
  execPromise(`${await dBusVars()} ${dBusMethod(dbusId, "Play")} >/dev/null`);

// Since exec is not (yet) Promisified, this function makes things easier
export const execPromise = (command: string) =>
  new Promise<ExecResult>((resolve, reject) => {
    exec(command, (err, stdout, stderr) => {
      if (err) {
        reject("execPromise error:" + JSON.stringify({ err, command }));
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
