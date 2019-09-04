jest.mock('../environment.ts', () => ({
  IS_DEV: true,
  IS_PROD: false,
}))

import { AudioOutput, Player } from '../player'

describe(`Player defaults`, () => {
  let player: Player

  beforeEach(() => {
    player = new Player('dummy.mp4')
  })

  it('should return an object', () => {
    expect(typeof player).toBe('object')
  })
  it('should get default layer if none specified', () => {
    expect(player.getSettings().layer).toEqual(1)
  })
  it('should get default dBUS ID if none specified', () => {
    expect(player.getSettings().dBusId).toBe('org.mpris.MediaPlayer2.omxplayer')
  })
  it('should get default audio output option', () => {
    expect(player.getSettings().audioOutput).toBe('both')
  })
  it('should have a black background if none specified', () => {
    // tslint:disable-next-line:no-magic-numbers
    expect(player.getSettings().backgroundColor).toBe('0xff000000')
  })
  it('should have no background if explicitly disabled', () => {
    player = new Player('dummy.mp4', { noBackgroundColor: true })
    expect(player.getSettings().noBackgroundColor).toBe(true)
  })
  it('should have a different audio output if specified', () => {
    player = new Player('dummy.mp4', { audioOutput: AudioOutput.hdmi })
    expect(player.getSettings().audioOutput).toBe('hdmi')
  })
})

describe('Player open()', () => {
  let player: Player

  beforeEach(() => {
    player = new Player('./demo/media/tenseconds.mp4')
    player.enableTestMode()
  })

  // tslint:disable:no-any no-unsafe-any
  it('should return an error when file not found', () => {
    player = new Player('dummy.mp4')
    player.open().catch((err: any) => {
      // tslint:disable-next-line:no-console
      // console.error('ignore this error:', err);
      expect(err.err).toBeDefined()
    })
  })

  it('should proceed without error if file exists', () => {
    player
      .open()
      .then((result: any) => {
        expect(result.playing).toBe(true)
        expect(result.filePath.split('/')).toContain('tenseconds.mp4')
      })
      .catch((err: any) => {
        // tslint:disable-next-line:no-console
        console.error(err)
      })
  })

  it('should resolve with a valid omxplayer command', () => {
    player
      .open()
      .then((result: any) => {
        expect(result.command).toEqual({
          command:
            'omxplayer "/home/pi/omx-conductor/demo/media/tenseconds.mp4" -o both -b0xff000000 --dbus_name org.mpris.MediaPlayer2.omxplayer --loop --layer 1 < omxpipe1',
          testModeOnly: true,
        })
      })
      .catch((err: any) => {
        // tslint:disable-next-line:no-console
        console.error(err)
      })
  })

  // tslint:enable
})
