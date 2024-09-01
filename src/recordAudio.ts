// @ts-ignore
import toWav from "audiobuffer-to-wav";
import Tone from "tone";

export function initRecordButton() {
  const button = document.getElementById("record") as HTMLButtonElement;
  button.addEventListener("click", () => {
    const recorder = new Tone.Recorder();
    const synth = new Tone.Synth().connect(recorder);
    recorder.start();
    synth.triggerAttackRelease("C3", 0.5);
    synth.triggerAttackRelease("C4", 0.5, "+1");
    synth.triggerAttackRelease("C5", 0.5, "+2");
    setTimeout(async () => {
      const recording = (await recorder.stop()) as Blob;
      const audioContext = new window.AudioContext();

      const arrayBuffer = await recording.arrayBuffer();

      audioContext.decodeAudioData(arrayBuffer, (audioBuffer) => {
        const wav = toWav(audioBuffer);

        const blob = new window.Blob([new DataView(wav)], {
          type: "audio/wav",
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "output.wav";
        a.click();
      });
    }, 4000);
  });
}
