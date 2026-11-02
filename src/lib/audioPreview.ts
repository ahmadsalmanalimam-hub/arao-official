// Web Audio API Synthesizer for instant, dependency-free trending sound previews

let audioCtx: AudioContext | null = null;
let currentOscillators: OscillatorNode[] = [];
let currentGainNodes: GainNode[] = [];
let previewTimer: any = null;

export function stopSoundPreview() {
  if (previewTimer) {
    clearInterval(previewTimer);
    previewTimer = null;
  }
  currentOscillators.forEach((osc) => {
    try {
      osc.stop();
      osc.disconnect();
    } catch {}
  });
  currentGainNodes.forEach((gain) => {
    try {
      gain.disconnect();
    } catch {}
  });
  currentOscillators = [];
  currentGainNodes = [];
}

export function playSoundPreview(soundId: string, onStop?: () => void) {
  stopSoundPreview();

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new AudioContextClass();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    // Melodic notes base frequencies for African rhythm / pop chord progression
    const notePatterns: Record<string, number[]> = {
      calm_down: [261.63, 329.63, 392.0, 440.0], // C - E - G - A
      last_last: [220.0, 261.63, 329.63, 392.0],  // A - C - E - G
      who_your_guy: [293.66, 369.99, 440.0, 587.33], // D - F# - A - D
      sungba: [196.0, 246.94, 293.66, 392.0],     // G - B - D - G
      amapiano: [164.81, 196.0, 220.0, 329.63],   // Amapiano log drum base
      rush: [349.23, 440.0, 523.25, 659.25],      // F - A - C - E
      buga: [261.63, 329.63, 392.0, 523.25],      // Buga upbeat
      unavailable: [220.0, 277.18, 329.63, 440.0], // Afrobeat groove
      soso: [174.61, 220.0, 261.63, 349.23],
      love_nwantiti: [329.63, 392.0, 493.88, 587.33],
      peru: [261.63, 293.66, 349.23, 440.0],
      essence: [220.0, 261.63, 329.63, 440.0],
      charm: [293.66, 349.23, 440.0, 523.25],
      water: [349.23, 392.0, 440.0, 587.33],
      cast: [196.0, 220.0, 261.63, 392.0],
      this_year: [261.63, 329.63, 392.0, 523.25]
    };

    const notes = notePatterns[soundId] || [261.63, 329.63, 392.0, 523.25];
    let step = 0;

    const playBeat = () => {
      if (!audioCtx || audioCtx.state === 'closed') return;
      const now = audioCtx.currentTime;

      // 1. Kick/log drum punch
      const kickOsc = audioCtx.createOscillator();
      const kickGain = audioCtx.createGain();
      kickOsc.type = 'sine';
      kickOsc.frequency.setValueAtTime(soundId.includes('amapiano') ? 85 : 120, now);
      kickOsc.frequency.exponentialRampToValueAtTime(35, now + 0.15);
      kickGain.gain.setValueAtTime(0.3, now);
      kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      kickOsc.connect(kickGain);
      kickGain.connect(audioCtx.destination);
      kickOsc.start(now);
      kickOsc.stop(now + 0.2);

      // 2. Melodic synth tone
      const noteFreq = notes[step % notes.length];
      const melOsc = audioCtx.createOscillator();
      const melGain = audioCtx.createGain();
      melOsc.type = soundId.includes('amapiano') ? 'triangle' : 'sine';
      melOsc.frequency.setValueAtTime(noteFreq, now);
      melGain.gain.setValueAtTime(0.12, now);
      melGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
      melOsc.connect(melGain);
      melGain.connect(audioCtx.destination);
      melOsc.start(now);
      melOsc.stop(now + 0.35);

      step++;
    };

    playBeat();
    previewTimer = setInterval(playBeat, 380);

    // Auto stop preview after 8 seconds
    setTimeout(() => {
      stopSoundPreview();
      if (onStop) onStop();
    }, 8000);
  } catch (err) {
    console.warn('Audio preview not supported:', err);
  }
}
