const { Player } = require('omxconductor')

const player = new Player({})
console.log('omx config:\n', player.getSettings())
