import { AudioOutput, PlayerSettings } from './player'

export const defaultOptions: PlayerSettings = {
  layer: 1,
  dBusId: 'org.mpris.MediaPlayer2.omxplayer',
  audioOutput: 'both' as AudioOutput,
  backgroundColor: '0xff000000',
  noBackgroundColor: false,
  loop: true,
  testModeOnly: false,
  progressInterval: 16,
}

export const CONTROL_CHECK_INTERVAL_MS = 500
export const CONTROL_CHECK_MAX_ATTEMPTS = 10
export const CHECK_MISS_RATIO = 2
