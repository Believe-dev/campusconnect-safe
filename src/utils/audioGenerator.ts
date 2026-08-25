// Generate procedural background music using Web Audio API
export class AudioGenerator {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private oscillators: OscillatorNode[] = [];
  private isPlaying = false;

  constructor() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
      this.gainNode.gain.value = 0.1;
    } catch (error) {
      console.warn('Web Audio API not supported');
    }
  }

  private createTone(frequency: number, type: OscillatorType = 'sine', duration: number = 1) {
    if (!this.audioContext || !this.gainNode) return;

    const oscillator = this.audioContext.createOscillator();
    const envelope = this.audioContext.createGain();
    
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
    
    envelope.gain.setValueAtTime(0, this.audioContext.currentTime);
    envelope.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.1);
    envelope.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
    
    oscillator.connect(envelope);
    envelope.connect(this.gainNode);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
    
    this.oscillators.push(oscillator);
    
    setTimeout(() => {
      const index = this.oscillators.indexOf(oscillator);
      if (index > -1) this.oscillators.splice(index, 1);
    }, duration * 1000);
  }

  playQuizMusic() {
    if (!this.audioContext) return;
    
    const playLoop = () => {
      if (!this.isPlaying) return;
      
      // Upbeat melody
      const notes = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25];
      const randomNote = notes[Math.floor(Math.random() * notes.length)];
      this.createTone(randomNote, 'triangle', 0.5);
      
      setTimeout(playLoop, 600);
    };
    
    this.isPlaying = true;
    playLoop();
  }

  playMemoryMusic() {
    if (!this.audioContext) return;
    
    const playLoop = () => {
      if (!this.isPlaying) return;
      
      // Calm focus tones
      const notes = [220, 246.94, 261.63, 293.66, 329.63];
      const randomNote = notes[Math.floor(Math.random() * notes.length)];
      this.createTone(randomNote, 'sine', 2);
      
      setTimeout(playLoop, 2500);
    };
    
    this.isPlaying = true;
    playLoop();
  }

  playTapMusic() {
    if (!this.audioContext) return;
    
    const playLoop = () => {
      if (!this.isPlaying) return;
      
      // Energetic beats
      this.createTone(130.81, 'square', 0.2);
      setTimeout(() => this.createTone(196.00, 'square', 0.2), 250);
      
      setTimeout(playLoop, 500);
    };
    
    this.isPlaying = true;
    playLoop();
  }

  playWordMusic() {
    if (!this.audioContext) return;
    
    const playLoop = () => {
      if (!this.isPlaying) return;
      
      // Gentle melody
      const notes = [174.61, 196.00, 220.00, 246.94, 261.63];
      const randomNote = notes[Math.floor(Math.random() * notes.length)];
      this.createTone(randomNote, 'sine', 1.5);
      
      setTimeout(playLoop, 2000);
    };
    
    this.isPlaying = true;
    playLoop();
  }

  playMathMusic() {
    if (!this.audioContext) return;
    
    const playLoop = () => {
      if (!this.isPlaying) return;
      
      // Concentration rhythm
      this.createTone(220, 'triangle', 0.8);
      setTimeout(() => this.createTone(330, 'triangle', 0.8), 1000);
      
      setTimeout(playLoop, 2000);
    };
    
    this.isPlaying = true;
    playLoop();
  }

  playColorMusic() {
    if (!this.audioContext) return;
    
    const playLoop = () => {
      if (!this.isPlaying) return;
      
      // Playful tones
      const notes = [261.63, 329.63, 392.00, 523.25];
      notes.forEach((note, i) => {
        setTimeout(() => this.createTone(note, 'triangle', 0.3), i * 200);
      });
      
      setTimeout(playLoop, 1500);
    };
    
    this.isPlaying = true;
    playLoop();
  }

  playReactionMusic() {
    if (!this.audioContext) return;
    
    const playLoop = () => {
      if (!this.isPlaying) return;
      
      // Intense pulse
      this.createTone(110, 'sawtooth', 0.1);
      setTimeout(() => this.createTone(220, 'sawtooth', 0.1), 150);
      
      setTimeout(playLoop, 400);
    };
    
    this.isPlaying = true;
    playLoop();
  }

  playCrosswordMusic() {
    if (!this.audioContext) return;
    
    const playLoop = () => {
      if (!this.isPlaying) return;
      
      // Ambient atmosphere
      const notes = [146.83, 164.81, 174.61, 196.00];
      const randomNote = notes[Math.floor(Math.random() * notes.length)];
      this.createTone(randomNote, 'sine', 3);
      
      setTimeout(playLoop, 4000);
    };
    
    this.isPlaying = true;
    playLoop();
  }

  playFillwordMusic() {
    if (!this.audioContext) return;
    
    const playLoop = () => {
      if (!this.isPlaying) return;
      
      // Peaceful melody
      const notes = [196.00, 220.00, 246.94, 261.63, 293.66];
      const randomNote = notes[Math.floor(Math.random() * notes.length)];
      this.createTone(randomNote, 'sine', 2.5);
      
      setTimeout(playLoop, 3000);
    };
    
    this.isPlaying = true;
    playLoop();
  }

  stop() {
    this.isPlaying = false;
    this.oscillators.forEach(osc => {
      try {
        osc.stop();
      } catch (e) {}
    });
    this.oscillators = [];
  }

  setVolume(volume: number) {
    if (this.gainNode) {
      this.gainNode.gain.value = volume * 0.1;
    }
  }
}