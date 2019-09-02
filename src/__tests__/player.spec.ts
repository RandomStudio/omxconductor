jest.mock('../environment.ts', () => ({
  IS_DEV: true,
  IS_PROD: false,
}))

import { Player } from '../player'

describe(`Player defaults`, () => {
  let player: Player

  beforeEach(() => {
    player = new Player({})
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
    expect(player.getSettings().audioOutput === 'both')
  })
})
