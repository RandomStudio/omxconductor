// import { IS_DEV } from './environment'
interface PlayerOptions {
  layer: number | null
  dBusId: string
}

const DBUS_DEST_DEFAULT = 'org.mpris.MediaPlayer2.omxplayer'

export class Player {
  private settings: PlayerOptions
  constructor({ layer = 1, dBusId = DBUS_DEST_DEFAULT }) {
    this.settings = {
      layer,
      dBusId,
    }
  }

  getSettings() {
    return this.settings
  }
}
