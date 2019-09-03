const { Player } = require('omxconductor')

const player = new Player('dummy.mp4')
console.log('omx config:\n', player.getSettings())

player.open().then((result) => {
  console('open result:', result)
})
