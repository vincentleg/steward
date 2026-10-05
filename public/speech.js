/** Replaceable speech boundaries. No recording, file upload, storage or automatic start. */
export function speechInput({ onState, onEnergy, onText, onError }) {
  const Recognition = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
  let recognition,
    stream,
    audio,
    frame = 0,
    generation = 0;
  const stop = () => {
    generation++;
    if (recognition) {
      recognition.onend = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.abort();
      recognition = null;
    }
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
    cancelAnimationFrame(frame);
    frame = 0;
    void audio?.close();
    audio = null;
    onEnergy(0);
    onState('conversation-idle');
  };
  async function start(consent) {
    if (!consent) throw Error('Consent is required before browser speech recognition.');
    if (!Recognition) throw Error('Speech recognition is unavailable in this browser. Use text.');
    stop();
    const expected = generation;
    try {
      const next = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (expected !== generation) {
        next.getTracks().forEach((t) => t.stop());
        return;
      }
      stream = next;
      audio = new AudioContext();
      const analyser = audio.createAnalyser();
      analyser.fftSize = 256;
      audio.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      const measure = () => {
        analyser.getByteTimeDomainData(data);
        const rms = Math.sqrt(
          data.reduce((sum, v) => sum + ((v - 128) / 128) ** 2, 0) / data.length,
        );
        onEnergy(Math.min(1, rms * 5));
        frame = requestAnimationFrame(measure);
      };
      measure();
      recognition = new Recognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.continuous = false;
      recognition.onresult = (e) => {
        const text = e.results[0][0].transcript;
        onText(text);
        stop();
      };
      recognition.onerror = (e) => {
        onError(
          e.error === 'not-allowed'
            ? 'Microphone permission was denied. Text remains available.'
            : 'Speech recognition stopped. Try again or use text.',
        );
        stop();
      };
      recognition.onend = () => stop();
      onState('listening');
      recognition.start();
    } catch {
      stop();
      throw Error('Microphone is unavailable or permission was denied. Use text.');
    }
  }
  return { available: Boolean(Recognition), start, stop };
}
/** Output is quality-gated. A future approved provider supplies decoded speech, not text-to-tool authority. */
export function speechOutput({ onState, onEnergy, approved = false }) {
  let audio,
    source,
    frame = 0;
  function stop() {
    cancelAnimationFrame(frame);
    if (source) {
      source.onended = null;
      source.stop();
      source = null;
    }
    void audio?.close();
    audio = null;
    onEnergy(0);
    onState('conversation-idle');
  }
  return {
    available: approved,
    stop,
    async play(buffer) {
      if (!approved) throw Error('Premium speech output has not passed its quality gate.');
      stop();
      audio = new AudioContext();
      const analyser = audio.createAnalyser();
      analyser.fftSize = 256;
      source = audio.createBufferSource();
      source.buffer = buffer;
      source.connect(analyser);
      analyser.connect(audio.destination);
      const samples = new Float32Array(256);
      const measure = () => {
        analyser.getFloatTimeDomainData(samples);
        onEnergy(
          Math.min(1, Math.sqrt(samples.reduce((s, n) => s + n * n, 0) / samples.length) * 4),
        );
        frame = requestAnimationFrame(measure);
      };
      onState('responding');
      source.onended = stop;
      source.start();
      measure();
    },
  };
}
