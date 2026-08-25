export class SoundEffects {
  private audioContext: AudioContext | null = null;

  constructor() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn('Web Audio API not supported');
    }
  }

  private createTone(frequency: number, duration: number, type: OscillatorType = 'sine') {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
    
    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  playWinSound() {
    // Victory fanfare
    setTimeout(() => this.createTone(523.25, 0.2), 0);
    setTimeout(() => this.createTone(659.25, 0.2), 200);
    setTimeout(() => this.createTone(783.99, 0.4), 400);
  }

  playLoseSound() {
    // Descending sad tones
    setTimeout(() => this.createTone(392.00, 0.3), 0);
    setTimeout(() => this.createTone(329.63, 0.3), 300);
    setTimeout(() => this.createTone(261.63, 0.5), 600);
  }
}

export const soundEffects = new SoundEffects();