const { Player } = require('omxconductor')

const player = new Player('media/tenseconds.mp4', { loop: true })
console.log('omx config:\n', player.getSettings())

player
  .open()
  .then((result) => {
    console.log('open result:', result)
  })
  .catch((err) => {
    console.error('error on open:', err)
  })

player.on('open', (result) => {
  console.log('open event:', result)
})

player.on('ready', (result) => {
  console.log('ready event:', result)
  player.on('progress', (progress) => {
    console.log('progress event:', progress)
    if (progress.progress >= 0.8) {
      console.log('seek back to zero...')
      player.seekAbsolute(0)
    }
  })
})

player.on('error', (err) => {
  console.error('error event:', err)
  // process.exit(1)
})

player.on('close', (result) => {
  console.log('pipe closed event:', result)
  process.exit(0)
})
