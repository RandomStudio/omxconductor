import { AudioOutput, PlayerSettings } from './player'

export const defaultOptions: PlayerSettings = {
  layer: 1,
  dBusId: 'org.mpris.MediaPlayer2.omxplayer',
  audioOutput: 'both' as AudioOutput,
  backgroundColor: 0xff000000,
  noBackgroundColor: false,
  loop: true,
  testModeOnly: false,
}
