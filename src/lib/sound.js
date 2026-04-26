export async function playReadyChime() {
  if (typeof window === "undefined") {
    return;
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) {
    return;
  }

  const audioContext = new AudioContextClass();
  const now = audioContext.currentTime;

  const createTone = (frequency, start, duration, gainLevel) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, start);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(gainLevel, start + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  };

  createTone(740, now, 0.45, 0.12);
  createTone(932, now + 0.16, 0.42, 0.1);
  createTone(1174, now + 0.34, 0.58, 0.08);

  window.setTimeout(() => {
    audioContext.close().catch(() => {});
  }, 1_200);
}
