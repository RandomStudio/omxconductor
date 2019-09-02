// import { IS_DEV } from './environment'
import * as defaults from './defaults'

enum AudioOutput {
  hdmi = 'hdmi',
  local = 'local',
  both = 'both',
}

interface PlayerOptions {
  layer: number | null
  dBusId: string
  audioOutput: AudioOutput
}

export class Player {
  private settings: PlayerOptions
  constructor({
    layer = 1,
    dBusId = defaults.DBUS_DEST_DEFAULT,
    audioOutput = AudioOutput.both,
  }) {
    this.settings = { layer, dBusId, audioOutput }
  }

  getSettings() {
    return this.settings
  }
}
