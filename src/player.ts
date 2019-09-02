// import { IS_DEV } from './environment'
import * as defaults from './defaults'
interface PlayerOptions {
  layer: number | null
  dBusId: string
}

export class Player {
  private settings: PlayerOptions
  constructor({ layer = 1, dBusId = defaults.DBUS_DEST_DEFAULT }) {
    this.settings = {
      layer,
      dBusId,
    }
  }

  getSettings() {
    return this.settings
  }
}
