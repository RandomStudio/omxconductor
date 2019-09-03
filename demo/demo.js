const { Player } = require('omxconductor')

const player = new Player('media/tenseconds.mp4', { loop: false })
console.log('omx config:\n', player.getSettings())

player
  .open()
  .then((result) => {
    console.log('open result:', result)
  })
  .catch((err) => {
    console.error('error on open:', err)
  })
