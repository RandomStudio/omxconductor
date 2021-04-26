const Player = require("omxconductor");

const player = new Player("rtsp://sdb:SDB_2011@192.168.2.15:554/videoMain", {
  loop: false,
});
console.log("omx config:\n", player.getSettings());

player
  .open()
  .then((result) => {
    console.log("open result:", result);

    // this could be done here or on 'open' event
    player.registerPositionTrigger(5000, async (actualPosition) => {
      console.log("hit 5000ms trigger @", actualPosition);
      // player.seekAbsolute(0)
      // player.stop()
      await player.pause();
      setTimeout(() => {
        console.log("resume now!");
        player.resume();
      }, 4000);
    });
  })
  .catch((err) => {
    console.error("error on open:", err);
  });

player.on("open", (result) => {
  console.log("**************** open event:", result);
});

player.on("ready", (result) => {
  console.log("**************** ready event:", result);

  // EXAMPLE A: TRIGGER ON PROGRESS UPDATES YOURSELF
  // player.on('progress', (progress) => {
  //   console.log('progress event:', progress)
  //   if (progress.progress >= 0.2) {
  //     console.log('pause...')
  //     player.pause()
  //   }
  // })
});

player.on("error", (err) => {
  console.error("**************** error event:", err);
  // process.exit(1)
});

player.on("stopped", () => {
  console.log("**************** stopped event");
});

player.on("paused", () => {
  console.log("**************** paused event");
});

player.on("resumed", () => {
  console.log("**************** resumed event");
});

player.on("close", (result) => {
  console.log("**************** pipe closed event:", result);
  process.exit(0);
});

// player.on('progress', (info) => {
//   console.log('progress all good:', info)
// })
