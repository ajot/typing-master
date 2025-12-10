import { useCallback, useRef, useEffect } from 'react';

type SoundName = 'keypress' | 'error' | 'success' | 'countdown' | 'gameOver';

interface UseSoundReturn {
  play: (name: SoundName) => void;
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
}

// Create audio context for 8-bit style sounds
class RetroSoundGenerator {
  private audioContext: AudioContext | null = null;
  private volume = 0.3;
  private muted = false;

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    return this.audioContext;
  }

  setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  setMuted(muted: boolean) {
    this.muted = muted;
  }

  playKeypress() {
    if (this.muted) return;
    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'square';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(this.volume * 0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.05);
  }

  playError() {
    if (this.muted) return;
    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.setValueAtTime(100, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(this.volume * 0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  }

  playSuccess() {
    if (this.muted) return;
    const ctx = this.getContext();
    const frequencies = [523, 659, 784]; // C5, E5, G5 chord

    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.05);

      gain.gain.setValueAtTime(this.volume * 0.2, ctx.currentTime + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3 + i * 0.05);

      osc.start(ctx.currentTime + i * 0.05);
      osc.stop(ctx.currentTime + 0.3 + i * 0.05);
    });
  }

  playCountdown() {
    if (this.muted) return;
    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'square';
    osc.frequency.setValueAtTime(440, ctx.currentTime);

    gain.gain.setValueAtTime(this.volume * 0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  }

  playGameOver() {
    if (this.muted) return;
    const ctx = this.getContext();
    const melody = [523, 587, 659, 698, 784, 880, 988, 1047]; // C major scale to C6

    melody.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);

      gain.gain.setValueAtTime(this.volume * 0.25, ctx.currentTime + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15 + i * 0.08);

      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + 0.15 + i * 0.08);
    });
  }
}

export function useSound(): UseSoundReturn {
  const soundGenRef = useRef<RetroSoundGenerator | null>(null);

  useEffect(() => {
    soundGenRef.current = new RetroSoundGenerator();
    return () => {
      soundGenRef.current = null;
    };
  }, []);

  const play = useCallback((name: SoundName) => {
    if (!soundGenRef.current) return;

    switch (name) {
      case 'keypress':
        soundGenRef.current.playKeypress();
        break;
      case 'error':
        soundGenRef.current.playError();
        break;
      case 'success':
        soundGenRef.current.playSuccess();
        break;
      case 'countdown':
        soundGenRef.current.playCountdown();
        break;
      case 'gameOver':
        soundGenRef.current.playGameOver();
        break;
    }
  }, []);

  const setVolume = useCallback((volume: number) => {
    if (soundGenRef.current) {
      soundGenRef.current.setVolume(volume);
    }
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    if (soundGenRef.current) {
      soundGenRef.current.setMuted(muted);
    }
  }, []);

  return { play, setVolume, setMuted };
}
