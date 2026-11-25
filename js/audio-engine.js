(function (global) {
  'use strict';

  class AudvisAudioEngine {
    constructor() {
      this.ctx = null;
      this.analyser = null;
      this.gainNode = null;
      this.sourceBus = null;
      this.exportDest = null;

      this.audioEl = new Audio();
      this.audioEl.crossOrigin = 'anonymous';
      this.audioEl.preload = 'auto';
      this.mediaSource = null;
      this.objectUrl = null;

      this.mode = 'none'; // 'none' | 'file' | 'demo' | 'mic'
      this.trackName = '';
      this.isPlaying = false;
      this.volume = 0.9;
      this.muted = false;

      // FFT buffers
      this.fftExponent = 9; // 512
      this.smoothing = 0.8;
      this.freqData = new Uint8Array(256);
      this.timeData = new Uint8Array(512);

      // Demo synth state
      this._demoTimer = null;
      this._demoStep = 0;
      this._demoStartTime = 0;

      // Mic state
      this._micStream = null;
      this._micSource = null;

      // Listeners
      this.onStateChange = null;
      this.onEnded = null;
      this.onError = null;

      this._bindAudioElementEvents();
    }

    _ensureContext() {
      if (!this.ctx) {
        const AudioCtx = global.AudioContext || global.webkitAudioContext;
        this.ctx = new AudioCtx();

        this.sourceBus = this.ctx.createGain();
        this.gainNode = this.ctx.createGain();
        this.gainNode.gain.value = this.muted ? 0 : this.volume;

        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = Math.pow(2, this.fftExponent);
        this.analyser.smoothingTimeConstant = this.smoothing;
        this.analyser.minDecibels = -92;
        this.analyser.maxDecibels = -12;

        this.exportDest = this.ctx.createMediaStreamDestination();

        this.sourceBus.connect(this.gainNode);
        this.gainNode.connect(this.analyser);
        this.analyser.connect(this.ctx.destination);
        this.sourceBus.connect(this.exportDest);

        this._resizeBuffers();
      }
      if (this.ctx.state === 'suspended') {
        return this.ctx.resume();
      }
      return Promise.resolve();
    }

    _resizeBuffers() {
      if (!this.analyser) return;
      this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
      this.timeData = new Uint8Array(this.analyser.fftSize);
    }

    _bindAudioElementEvents() {
      this.audioEl.addEventListener('ended', () => {
        if (this.mode === 'file') {
          this.isPlaying = false;
          this._emitState();
          if (typeof this.onEnded === 'function') this.onEnded();
        }
      });

      this.audioEl.addEventListener('play', () => {
        if (this.mode === 'file') {
          this.isPlaying = true;
          this._emitState();
        }
      });

      this.audioEl.addEventListener('pause', () => {
        if (this.mode === 'file') {
          this.isPlaying = false;
          this._emitState();
        }
      });

      this.audioEl.addEventListener('loadedmetadata', () => {
        this._emitState();
      });

      this.audioEl.addEventListener('error', () => {
        if (this.mode === 'file' && typeof this.onError === 'function') {
          this.onError('Could not decode this audio file. Try MP3, WAV, OGG, or AAC.');
        }
      });
    }

    _emitState() {
      if (typeof this.onStateChange === 'function') {
        this.onStateChange(this.getState());
      }
    }

    getState() {
      return {
        mode: this.mode,
        trackName: this.trackName,
        isPlaying: this.isPlaying,
        currentTime: this.getCurrentTime(),
        duration: this.getDuration(),
        volume: this.volume,
        muted: this.muted,
        hasAudio: this.mode !== 'none'
      };
    }

    async loadFile(file) {
      if (!file) return;
      await this._ensureContext();
      this.stopAllSources();

      if (!this.mediaSource) {
        this.mediaSource = this.ctx.createMediaElementSource(this.audioEl);
        this.mediaSource.connect(this.sourceBus);
      }

      if (this.objectUrl) {
        URL.revokeObjectURL(this.objectUrl);
      }
      this.objectUrl = URL.createObjectURL(file);
      this.audioEl.src = this.objectUrl;
      this.audioEl.load();

      this.mode = 'file';
      this.trackName = file.name;
      this.isPlaying = false;
      this._emitState();
    }

    async startDemoSynth() {
      await this._ensureContext();
      this.stopAllSources();

      this.mode = 'demo';
      this.trackName = 'audvis Demo Synth (118 BPM)';
      this.isPlaying = true;
      this._demoStep = 0;
      this._demoStartTime = this.ctx.currentTime;

      const stepMs = (60 / 118 / 4) * 1000; // 16th notes at 118 BPM (~127ms)
      const bassNotes = [55, 55, 65.41, 73.42, 49, 49, 61.74, 65.41]; // A1, C2, D2, G1...
      const arpNotes = [220, 261.63, 329.63, 392, 440, 392, 329.63, 523.25, 293.66, 349.23, 440, 523.25, 246.94, 293.66, 392, 493.88];

      const triggerStep = () => {
        if (!this.isPlaying || this.mode !== 'demo') return;
        const now = this.ctx.currentTime;
        const step = this._demoStep % 16;
        const bar = Math.floor(this._demoStep / 16) % 4;

        // Kick on 0, 4, 8, 12
        if (step % 4 === 0) {
          this._playKick(now);
        }
        // Snare/clap on 4, 12
        if (step === 4 || step === 12) {
          this._playSnare(now);
        }
        // Hi-hat on offbeats & 16ths
        if (step % 2 === 1 || step % 4 === 2) {
          this._playHat(now, step % 4 === 2 ? 0.14 : 0.07);
        }
        // Bass on driving 8th pattern
        if (step % 2 === 0) {
          const bassFreq = bassNotes[(bar * 2 + Math.floor(step / 8)) % bassNotes.length];
          this._playBass(now, bassFreq, 0.22);
        }
        // Melodic arp
        const arpFreq = arpNotes[(step + bar * 4) % arpNotes.length];
        this._playArp(now, arpFreq, 0.16);

        this._demoStep++;
      };

      triggerStep();
      this._demoTimer = global.setInterval(triggerStep, stepMs);
      this._emitState();
    }

    _playKick(t) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(145, t);
      osc.frequency.exponentialRampToValueAtTime(38, t + 0.14);
      g.gain.setValueAtTime(0.75, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(g);
      g.connect(this.sourceBus);
      osc.start(t);
      osc.stop(t + 0.3);
    }

    _playSnare(t) {
      // Short filtered noise burst
      const dur = 0.14;
      const bufSize = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.35));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buf;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1800, t);
      filter.Q.value = 0.9;

      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.32, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);

      noise.connect(filter);
      filter.connect(g);
      g.connect(this.sourceBus);
      noise.start(t);
    }

    _playHat(t, level) {
      const dur = 0.045;
      const bufSize = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.25));
      }
      const src = this.ctx.createBufferSource();
      src.buffer = buf;

      const hp = this.ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.setValueAtTime(6500, t);

      const g = this.ctx.createGain();
      g.gain.setValueAtTime(level, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);

      src.connect(hp);
      hp.connect(g);
      g.connect(this.sourceBus);
      src.start(t);
    }

    _playBass(t, freq, dur) {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const g = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(480, t);
      filter.frequency.exponentialRampToValueAtTime(140, t + dur);
      filter.Q.value = 3;

      g.gain.setValueAtTime(0.28, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);

      osc.connect(filter);
      filter.connect(g);
      g.connect(this.sourceBus);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    }

    _playArp(t, freq, dur) {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const g = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2800, t);
      filter.frequency.exponentialRampToValueAtTime(700, t + dur);

      g.gain.setValueAtTime(0.16, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);

      osc.connect(filter);
      filter.connect(g);
      g.connect(this.sourceBus);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    }

    async startMic() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone capture is not supported in this browser.');
      }
      await this._ensureContext();
      this.stopAllSources();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true
        },
        video: false
      });

      this._micStream = stream;
      this._micSource = this.ctx.createMediaStreamSource(stream);
      // Connect mic only to analyser (and exportDest) so speakers don't feedback
      this._micSource.connect(this.analyser);
      this._micSource.connect(this.exportDest);

      this.mode = 'mic';
      this.trackName = 'Live Microphone';
      this.isPlaying = true;
      this._emitState();
    }

    stopAllSources() {
      if (this._demoTimer) {
        clearInterval(this._demoTimer);
        this._demoTimer = null;
      }
      if (this._micSource) {
        try {
          this._micSource.disconnect();
        } catch (_e) {}
        this._micSource = null;
      }
      if (this._micStream) {
        this._micStream.getTracks().forEach((t) => t.stop());
        this._micStream = null;
      }
      if (!this.audioEl.paused) {
        this.audioEl.pause();
      }
      this.audioEl.currentTime = 0;
      this.isPlaying = false;
    }

    async play() {
      await this._ensureContext();
      if (this.mode === 'file') {
        await this.audioEl.play();
        this.isPlaying = true;
      } else if (this.mode === 'demo') {
        if (!this._demoTimer) {
          await this.startDemoSynth();
          return;
        }
        this.isPlaying = true;
      } else if (this.mode === 'mic') {
        this.isPlaying = true;
      }
      this._emitState();
    }

    pause() {
      if (this.mode === 'file') {
        this.audioEl.pause();
        this.isPlaying = false;
      } else if (this.mode === 'demo') {
        if (this._demoTimer) {
          clearInterval(this._demoTimer);
          this._demoTimer = null;
        }
        this.isPlaying = false;
      } else if (this.mode === 'mic') {
        this.stop();
        return;
      }
      this._emitState();
    }

    stop() {
      if (this.mode === 'file') {
        this.audioEl.pause();
        this.audioEl.currentTime = 0;
        this.isPlaying = false;
      } else if (this.mode === 'demo') {
        if (this._demoTimer) {
          clearInterval(this._demoTimer);
          this._demoTimer = null;
        }
        this.isPlaying = false;
      } else if (this.mode === 'mic') {
        this.stopAllSources();
        this.mode = 'none';
        this.trackName = '';
      }
      this._emitState();
    }

    async togglePlayPause() {
      if (this.mode === 'none') return;
      if (this.isPlaying) {
        this.pause();
      } else {
        await this.play();
      }
    }

    seek(seconds) {
      if (this.mode !== 'file') return;
      const dur = this.getDuration();
      if (!Number.isFinite(dur) || dur <= 0) return;
      this.audioEl.currentTime = Math.max(0, Math.min(dur, seconds));
      this._emitState();
    }

    seekRelative(deltaSeconds) {
      if (this.mode !== 'file') return;
      this.seek(this.getCurrentTime() + deltaSeconds);
    }

    getCurrentTime() {
      if (this.mode === 'file') return this.audioEl.currentTime || 0;
      if (this.mode === 'demo' && this.ctx && this.isPlaying) {
        return Math.max(0, this.ctx.currentTime - this._demoStartTime);
      }
      return 0;
    }

    getDuration() {
      if (this.mode === 'file') {
        return Number.isFinite(this.audioEl.duration) ? this.audioEl.duration : 0;
      }
      return 0;
    }

    setVolume(val) {
      this.volume = Math.max(0, Math.min(1, val));
      if (this.gainNode && this.ctx) {
        this.gainNode.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.015);
      }
      this._emitState();
    }

    setMuted(muted) {
      this.muted = Boolean(muted);
      if (this.gainNode && this.ctx) {
        this.gainNode.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.015);
      }
      this._emitState();
    }

    setFftExponent(exp) {
      const clamped = Math.max(5, Math.min(12, Math.round(exp)));
      this.fftExponent = clamped;
      if (this.analyser) {
        this.analyser.fftSize = Math.pow(2, clamped);
        this._resizeBuffers();
      }
      return Math.pow(2, clamped);
    }

    setSmoothing(val) {
      const clamped = Math.max(0, Math.min(0.95, Number(val)));
      this.smoothing = clamped;
      if (this.analyser) {
        this.analyser.smoothingTimeConstant = clamped;
      }
      return clamped;
    }

    sample(timeSec) {
      if (this.analyser && (this.isPlaying || this.mode === 'file')) {
        this.analyser.getByteFrequencyData(this.freqData);
        this.analyser.getByteTimeDomainData(this.timeData);
        if (this.isPlaying) {
          return { freqData: this.freqData, timeData: this.timeData, isIdle: false };
        }
      }

      // Gentle ambient preview when no track is loaded so users can preview styles immediately
      const binCount = Math.pow(2, this.fftExponent - 1);
      const fftSize = binCount * 2;
      if (this.freqData.length !== binCount) this.freqData = new Uint8Array(binCount);
      if (this.timeData.length !== fftSize) this.timeData = new Uint8Array(fftSize);

      if (this.mode === 'none') {
        const t = timeSec;
        for (let i = 0; i < binCount; i++) {
          const norm = i / binCount;
          const envelope = Math.exp(-norm * 2.4);
          const wave =
            0.5 +
            0.3 * Math.sin(norm * 10 - t * 2.1) +
            0.2 * Math.cos(norm * 22 + t * 1.4);
          this.freqData[i] = Math.max(0, Math.min(255, Math.floor(wave * envelope * 135)));
        }
        for (let i = 0; i < fftSize; i++) {
          const p = (i / fftSize) * Math.PI * 4;
          const v = Math.sin(p - t * 3.0) * 28 + Math.sin(p * 2.5 + t * 1.8) * 12;
          this.timeData[i] = Math.max(0, Math.min(255, Math.round(128 + v)));
        }
        return { freqData: this.freqData, timeData: this.timeData, isIdle: true };
      }

      // Loaded & paused/stopped: decay smoothly toward silence
      for (let i = 0; i < this.freqData.length; i++) {
        this.freqData[i] = Math.floor(this.freqData[i] * 0.85);
      }
      for (let i = 0; i < this.timeData.length; i++) {
        this.timeData[i] = Math.round(128 + (this.timeData[i] - 128) * 0.85);
      }
      return { freqData: this.freqData, timeData: this.timeData, isIdle: false };
    }

    getExportAudioStream() {
      return this.exportDest ? this.exportDest.stream : null;
    }
  }

  global.AudvisAudioEngine = AudvisAudioEngine;
})(window);
