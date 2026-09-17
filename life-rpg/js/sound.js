class SoundSystem {
  constructor() {
    this._ctx = null;
    this._gain = null;
    this._muted = localStorage.getItem('life_rpg_muted') === '1';
  }

  init() {
    if (this._ctx) { this._ctx.resume(); return; }
    this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    this._gain = this._ctx.createGain();
    this._gain.gain.value = this._muted ? 0 : 0.5;
    this._gain.connect(this._ctx.destination);
  }

  _tone(freq, startTime, dur, type, gain) {
    if (!this._ctx) return;
    const osc = this._ctx.createOscillator();
    const env = this._ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.connect(env);
    env.connect(this._gain);
    env.gain.setValueAtTime(0, startTime);
    env.gain.linearRampToValueAtTime(gain, startTime + 0.015);
    env.gain.exponentialRampToValueAtTime(0.001, startTime + dur);
    osc.start(startTime);
    osc.stop(startTime + dur + 0.02);
  }

  playComplete() {
    if (!this._ctx) return;
    const now = this._ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((f, i) => this._tone(f, now + i * 0.08, 0.18, 'triangle', 0.32));
  }

  playLevelUp() {
    if (!this._ctx) return;
    const now = this._ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) =>
      this._tone(f, now + i * 0.09, 0.26, 'triangle', 0.38));
  }

  playRedeem() {
    if (!this._ctx) return;
    const now = this._ctx.currentTime;
    this._tone(880, now, 0.1, 'sine', 0.3);
    this._tone(1108.7, now + 0.09, 0.16, 'sine', 0.3);
  }

  playError() {
    if (!this._ctx) return;
    const now = this._ctx.currentTime;
    this._tone(200, now, 0.18, 'sawtooth', 0.2);
  }

  playClick() {
    if (!this._ctx) return;
    const now = this._ctx.currentTime;
    this._tone(660, now, 0.05, 'square', 0.12);
  }

  // 新增任務時的儀式感提示音：溫暖的兩音上升
  playAdd() {
    if (!this._ctx) return;
    const now = this._ctx.currentTime;
    this._tone(587.33, now, 0.09, 'triangle', 0.26);
    this._tone(880, now + 0.07, 0.15, 'triangle', 0.3);
  }

  toggleMute() {
    this._muted = !this._muted;
    localStorage.setItem('life_rpg_muted', this._muted ? '1' : '0');
    if (this._gain) this._gain.gain.setValueAtTime(this._muted ? 0 : 0.5, this._ctx.currentTime);
    return this._muted;
  }

  get muted() { return this._muted; }
}

const sound = new SoundSystem();
