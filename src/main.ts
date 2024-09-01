import { Muxer, ArrayBufferTarget } from "webm-muxer";

function main() {
  const startButton = document.getElementById("start") as HTMLButtonElement;

  let isRunning = false;

  const canvas = document.getElementById("canvas") as HTMLCanvasElement;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get 2D context from canvas");
  }

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: {
      codec: "V_VP9",
      width: 1280,
      height: 720,
      frameRate: 60,
    },
    audio: {
      codec: "A_OPUS",
      sampleRate: 44100,
      numberOfChannels: 2,
    },
    firstTimestampBehavior: "offset",
  });

  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => {
      if (!isRunning) return;
      muxer.addVideoChunk(chunk, meta);
    },
    error: console.error,
  });

  videoEncoder.configure({
    codec: "vp09.00.10.08",
    width: 1280,
    height: 720,
    bitrate: 1000000,
  });

  let time = 0;
  let prevT = 0;
  let lastKeyFrame = -Infinity;
  const update = (t: number) => {
    if (!isRunning) {
      requestAnimationFrame(update);
      return;
    }
    const delta = t - prevT;
    time += delta;
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "24px sans-serif";
    ctx.save();
    ctx.translate(150, 75);
    ctx.rotate(time / 1000);
    ctx.fillStyle = "white";
    ctx.fillText("Hello, world", 0, 0);
    ctx.translate(-150, -75);

    ctx.restore();

    const elapsedTime = time;
    const frame = new VideoFrame(canvas, {
      timestamp: elapsedTime * 1000,
    });

    const needsKeyFrame = elapsedTime - lastKeyFrame >= 10000;
    if (needsKeyFrame) lastKeyFrame = elapsedTime;

    videoEncoder.encode(frame, { keyFrame: needsKeyFrame });
    frame.close();

    prevT = t;
    requestAnimationFrame(update);
  };

  requestAnimationFrame(update);

  startButton.addEventListener("click", () => {
    isRunning = true;
    time = 0;
    startButton.disabled = true;
    startButton.textContent = "Recording...";

    setTimeout(() => {
      startButton.disabled = false;
      isRunning = false;
      startButton.textContent = "Start";

      videoEncoder.flush();
      muxer.finalize();
      const { buffer } = muxer.target;

      const blob = new Blob([buffer], { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "output.webm";
      a.click();
    }, 4000);
  });

  fetch("./output.wav").then(async (res) => {
    const audioEncoder = new AudioEncoder({
      output: (chunk, meta) => {
        muxer.addAudioChunk(chunk, meta);
      },
      error: console.error,
    });

    const buffer = await res.arrayBuffer();
    const audioContext = new AudioContext();
    const audioBuffer = await audioContext.decodeAudioData(buffer);

    const numberOfChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    const sampleRate = audioBuffer.sampleRate;

    audioEncoder.configure({
      codec: "opus",
      sampleRate: sampleRate,
      numberOfChannels: numberOfChannels,
      bitrate: sampleRate * numberOfChannels * 16,
    });

    const audioData = new AudioData({
      format: "s16",
      sampleRate: sampleRate,
      numberOfFrames: length,
      numberOfChannels: numberOfChannels,
      timestamp: 0,
      data: audioBuffer.getChannelData(0).buffer,
    });

    audioEncoder.encode(audioData);
  });
}

window.onload = main;
