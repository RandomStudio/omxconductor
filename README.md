# OMX Conductor

A convenient library for initiating and controlling video playback on [omxplayer](https://github.com/popcornmix/omxplayer) -- the command-line [OpenMAX](https://en.wikipedia.org/wiki/OpenMAX) media player built especially for Raspberry Pi -- via NodeJS.

## Check your GPU memory!

If you intend to play more than 1 video simultaneously, you should make sure that your Raspberry Pi is configured with more than the default 64MB normally allocated to the GPU. Otherwise you will get strange crashes.

To do it:

```
sudo raspi-config
```

...then pick `4 Performance Options`, then `P2 GPU Memory` and type a new value (128MB is good enough for 2 layers).

Reboot the machine.

## Use in your client application

Install

```
npm install omxconductor
```

Include the Player

```
const Player = require('omxconductor')
```

Instantiate the Player with media (file path or network stream) and optional settings (an object)

```
const player = new Player('media/bigbuckbunny.mp4', { loop: true })
```

Open the video and start playback. `open()` returns a Promise so you can also handle the result of successfully (or not) opening the video:

```
player
  .open()
  .then((result) => {
    console.log('Clip started playing OK! Some information:', result)
  })
  .catch((err) => {
    console.error('error on open:', err)
  })
```

See a working example in the `./demo/demo.js` file.

## Hook into events during playback

The `Player` class extends the NodeJS [EventEmitter](https://nodejs.org/api/events.html#events_class_eventemitter) class, so you can register your own listener functions. For example:

```
player.on('open', (result) => {
  console.log('open event:', result)
})
```

The list of available events so far, and a description of their meaning:

- `open`: Emitted when the video clip is successfully opened by omxplayer. A `result` object is included with the call to the listener, with some details about the clip that was open.
- `ready`: Emitted when omxconductor has successfully connected to the running omxplayer instance via [D-Bus](https://www.freedesktop.org/wiki/Software/dbus/). You should wait for this event before trying to do any live control of the video from your application. A `result` object includes some information including how many attempts it took before the instance was connected.
- `progress`: Emitted repeatedly (by default, about 60 times per second!) as the clip plays. You get an object with the properties `position`, `duration` and `progress` which is simply `position / duration` (i.e. `0` is the beginning, `0.5` is halfway and `1.0` is the end).
- `error`: Emitted on any kind of error in opening, playback, control commands, etc. An `error` object includes some (hopefully) useful information about what went wrong.
- `stopped`: Emitted when playback was successfully stopped manually (i.e. by your client application). Expect to receive a `closed` event immediately after this, because stopping playback closes the omxplayer instance.
- `paused`: Emitted when playback was successfully paused
- `resumed`: Emitted when playback was successfully resumed (paused => playing)
- `close`: Emitted when the omxplayer instance stops and/or the pipe closes. This could be good or bad, depending on the scenario. The `result` object returned includes the properties `err, stdout, stderr` which you can use to figure out what happened.

## Control the player while it's running

This is where the real power comes in. You can tell the player to seek, pause, etc. while it's running, via your client application.

All of the functions below are async (use Promises). For example:

```
await player.seekAbsolute(1000);
console.log('we just jumped to the 1 second mark!');
```

Here is a list of the available functions (so far); more coming soon...

- `seekAbsolute = (positionMs: number)`: jump to the position in the clip (specified in milliseconds)
- `pause = ()`: pause playback (omxplayer instance is still running and progress will still be updated)
- `resume = ()`: resume playback if paused (has no effect if already playing)
- `stop = ()`: stop playback (omxplayer instance will actually quit, but no errors should be thrown)

### Registering triggers

You can register handler functions that are triggered at specific positions (specified in milliseconds). The system continuously checks the progress of the player and tries to call the handler as close as possible to the position you specified. The handler is guarranteed to only be called _once_ - at least until the playhead moves to a position before the trigger point (in which case it is flagged to become triggerable again).

Here is an example where the system will jump to position `0` whenever it hits position `6000` (6 seconds in):

```
player.registerPositionTrigger(6000, (actualPosition) => {
      console.log('hit 6000ms trigger @', actualPosition)
      player.seekAbsolute(0)
    })
```

If for some reason you need another mode of control, you can also a listener on `progress` events and implement your own logic. For example:

```
player.on('progress', (progress) => {
  console.log('progress event:', progress)
  if (progress.progress >= 0.2) {
    console.log('pause...')
    player.pause()
  }
})
```

### A note on seek accuracy

If you are playing common formats such as H.264 and H.265 (recommended) then you might find that seeking to positions other than zero (`0`ms) is unreliable. This is because of [Inter-frame compression](https://en.wikipedia.org/wiki/Inter_frame) used in these codecs. If you need more accurate seek points, you will need to trans/en-code your video with keyframes explicitly set at these points.

---

## Development

### Testing clients against local (linked) version

You need to run `npm link` in the `dist` folder (after building).

### Quick build

If you are testing on a Raspberry Pi and need a quick(er) build (no linting, no tests, etc.), run:

```
npm run quickbuild
```

## Background

A successor to https://github.com/anselanza/omx-layers

We control the omxplayer instance(s) after launch using [D-Bus](https://www.freedesktop.org/wiki/Software/dbus/), a message bus system that allows for communication between applications.
