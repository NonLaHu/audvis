(function (global) {
  'use strict';

  const VISUALIZER_CATALOG = [
    { id: 'bar', name: 'Frequency Bars', category: 'bars', desc: 'Classic vertical spectrum with peak caps', usesBarWidth: true, usesGap: true },
    { id: 'mirrorBars', name: 'Mirror Bars', category: 'bars', desc: 'Symmetrical top-and-bottom spectrum', usesBarWidth: true, usesGap: true },
    { id: 'waterfall', name: 'Spectrogram', category: 'bars', desc: 'Scrolling real-time frequency heatmap', usesBarWidth: false, usesGap: false, isNew: true },
    { id: 'wave', name: 'Filled Wave', category: 'waves', desc: 'Smooth filled waveform envelope', usesBarWidth: false, usesGap: false },
    { id: 'line', name: 'Oscilloscope', category: 'waves', desc: 'Precision time-domain trace', usesBarWidth: false, usesGap: false },
    { id: 'siri', name: 'Siri Ribbons', category: 'waves', desc: 'Layered additive harmonic ribbons', usesBarWidth: false, usesGap: false },
    { id: 'mountain', name: 'Mountain Ridge', category: 'waves', desc: 'Parallax spectral terrain layers', usesBarWidth: false, usesGap: false },
    { id: 'aurora', name: 'Aurora Curtains', category: 'waves', desc: 'Flowing northern lights spectrum', usesBarWidth: false, usesGap: false, isNew: true },
    { id: 'radialBars', name: 'Radial Bars', category: 'radial', desc: '360° circular spectrum with center art', usesBarWidth: true, usesGap: true, usesRadial: true, usesCenterImage: true },
    { id: 'circularWave', name: 'Polar Wave', category: 'radial', desc: 'Closed circular harmonic ribbon', usesBarWidth: false, usesGap: false, usesRadial: true, usesCenterImage: true, isNew: true },
    { id: 'spectrumRings', name: 'Neon Rings', category: 'radial', desc: 'Concentric frequency band arcs', usesBarWidth: true, usesGap: false, usesRadial: true, usesCenterImage: true, isNew: true },
    { id: 'blob', name: 'Organic Blob', category: 'radial', desc: 'Fluid audio-deformed mesh (best at high FFT)', usesBarWidth: false, usesGap: false, usesRadial: true, hint: 'Tip: Organic Blob looks extra silky with FFT Detail at 1024–4096.' },
    { id: 'vinyl', name: 'Vinyl Record', category: 'radial', desc: 'Spinning turntable with custom center label', usesBarWidth: false, usesGap: false, usesRadial: true, usesCenterImage: true },
    { id: 'hexGrid', name: 'Hexagon Grid', category: 'geometric', desc: 'Reactive honeycomb matrix cells', usesBarWidth: false, usesGap: true },
    { id: 'cyberHorizon', name: 'Cyber Grid', category: 'geometric', desc: '3D synthwave horizon & audio sun', usesBarWidth: false, usesGap: false, isNew: true },
    { id: 'dnaHelix', name: 'Audio Helix', category: 'geometric', desc: '3D rotating double-helix strand', usesBarWidth: false, usesGap: false, isNew: true },
    { id: 'particleVortex', name: 'Particle Vortex', category: 'cosmic', desc: 'Bass-reactive orbital particle storm', usesBarWidth: false, usesGap: false },
    { id: 'dotToDot', name: 'Dot to Dot', category: 'cosmic', desc: 'Dynamic constellation node network', usesBarWidth: false, usesGap: false }
  ];

  const PALETTES = {
    solid: null,
    sunset: ['#ff5e62', '#ff9966', '#ffd166'],
    cyber: ['#00f5d4', '#38bdf8', '#818cf8'],
    emerald: ['#10b981', '#34d399', '#a7f3d0'],
    prism: ['#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#a855f7'],
    rosegold: ['#f472b6', '#fb7185', '#fcd34d'],
    duotone: 'duotone'
  };

  function hexToRgb(hex) {
    const clean = (hex || '#38bdf8').replace('#', '');
    const full = clean.length === 3
      ? clean.split('').map((c) => c + c).join('')
      : clean.padEnd(6, '0').slice(0, 6);
    const num = parseInt(full, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }

  function lerpColor(c1, c2, t) {
    const a = hexToRgb(c1);
    const b = hexToRgb(c2);
    const clamped = Math.max(0, Math.min(1, t));
    const r = Math.round(a.r + (b.r - a.r) * clamped);
    const g = Math.round(a.g + (b.g - a.g) * clamped);
    const bl = Math.round(a.b + (b.b - a.b) * clamped);
    return `rgb(${r}, ${g}, ${bl})`;
  }

  function rgba(hex, alpha) {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  class AudvisRenderer {
    constructor() {
      this.peaks = [];
      this.particles = [];
      this.dots = [];
      this.vinylAngle = 0;
      this.tonearmProgress = 0;
      this.lastTime = 0;
      this.waterfallCanvas = null;
      this.waterfallCtx = null;
      this._initParticles();
      this._initDots();
    }

    reset() {
      this.peaks = [];
      this.vinylAngle = 0;
      this.tonearmProgress = 0;
      this.lastTime = 0;
      this._initParticles();
      this._initDots();
      if (this.waterfallCtx && this.waterfallCanvas) {
        this.waterfallCtx.clearRect(0, 0, this.waterfallCanvas.width, this.waterfallCanvas.height);
      }
    }

    _initParticles() {
      this.particles = [];
      for (let i = 0; i < 150; i++) {
        this.particles.push({
          angle: Math.random() * Math.PI * 2,
          radiusNorm: 0.08 + Math.random() * 0.88,
          speed: 0.35 + Math.random() * 1.1,
          size: 1.4 + Math.random() * 3.2,
          band: Math.floor(Math.random() * 48),
          hueOffset: Math.random()
        });
      }
    }

    _initDots() {
      this.dots = [];
      for (let i = 0; i < 48; i++) {
        this.dots.push({
          x: Math.random(),
          y: Math.random(),
          vx: (Math.random() - 0.5) * 0.14,
          vy: (Math.random() - 0.5) * 0.14,
          band: Math.floor((i / 48) * 64)
        });
      }
    }

    _getPaletteStops(opts) {
      if (opts.colorMode === 'duotone') {
        return [opts.primaryColor || '#38bdf8', opts.secondaryColor || '#f472b6'];
      }
      const p = PALETTES[opts.colorMode];
      if (Array.isArray(p)) return p;
      return [opts.primaryColor || '#38bdf8', opts.primaryColor || '#38bdf8'];
    }

    _colorAt(opts, t, alpha = 1) {
      const stops = this._getPaletteStops(opts);
      const clamped = Math.max(0, Math.min(1, t));
      let hexOrRgb;
      if (stops.length === 1 || (stops.length === 2 && stops[0] === stops[1])) {
        const { r, g, b } = hexToRgb(stops[0]);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      }
      const scaled = clamped * (stops.length - 1);
      const idx = Math.min(stops.length - 2, Math.floor(scaled));
      const frac = scaled - idx;
      const a = hexToRgb(stops[idx]);
      const b = hexToRgb(stops[idx + 1]);
      const r = Math.round(a.r + (b.r - a.r) * frac);
      const g = Math.round(a.g + (b.g - a.g) * frac);
      const bl = Math.round(a.b + (b.b - a.b) * frac);
      hexOrRgb = `rgba(${r}, ${g}, ${bl}, ${alpha})`;
      return hexOrRgb;
    }

    _makeLinearGradient(ctx, opts, x0, y0, x1, y1, alpha = 1) {
      const grad = ctx.createLinearGradient(x0, y0, x1, y1);
      const stops = this._getPaletteStops(opts);
      if (stops.length === 1) {
        grad.addColorStop(0, this._colorAt(opts, 0, alpha));
        grad.addColorStop(1, this._colorAt(opts, 1, alpha));
        return grad;
      }
      stops.forEach((c, idx) => {
        const { r, g, b } = hexToRgb(c);
        grad.addColorStop(idx / (stops.length - 1), `rgba(${r}, ${g}, ${b}, ${alpha})`);
      });
      return grad;
    }

    _applyGlow(ctx, opts, scale = 1, customColor = null) {
      const glow = Number(opts.glow ?? 0.45);
      if (glow <= 0.01) {
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
        return;
      }
      ctx.shadowBlur = 22 * glow * scale;
      ctx.shadowColor = customColor || this._colorAt(opts, 0.35, 0.85);
    }

    _clearGlow(ctx) {
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
    }

    _getEnergy(freqData, startRatio, endRatio, sensitivity) {
      const start = Math.floor(freqData.length * startRatio);
      const end = Math.max(start + 1, Math.floor(freqData.length * endRatio));
      let sum = 0;
      for (let i = start; i < end; i++) sum += freqData[i];
      const avg = sum / ((end - start) * 255);
      return Math.min(1.5, avg * sensitivity);
    }

    _paintBackground(ctx, w, h, opts, forceOpaque = false) {
      const mode = opts.bgMode || 'transparent';
      if (mode === 'transparent' && !forceOpaque) {
        ctx.clearRect(0, 0, w, h);
        return;
      }
      let fill = '#0b0d12';
      if (mode === 'dark') fill = '#0b0d12';
      else if (mode === 'light') fill = '#f8fafc';
      else if (mode === 'custom') fill = opts.bgCustomColor || '#0b0d12';
      else if (mode === 'transparent' && forceOpaque) fill = '#0b0d12';

      ctx.save();
      ctx.fillStyle = fill;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    _drawCenterImage(ctx, cx, cy, radius, img, rotation = 0) {
      if (!img || !img.complete || img.naturalWidth === 0) return false;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      ctx.translate(cx, cy);
      if (rotation) ctx.rotate(rotation);

      // Cover crop
      const aspect = img.naturalWidth / img.naturalHeight;
      let drawW = radius * 2;
      let drawH = radius * 2;
      if (aspect > 1) {
        drawW = drawH * aspect;
      } else {
        drawH = drawW / aspect;
      }
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
      return true;
    }

    render(ctx, width, height, freqData, timeData, opts, nowSec, forceOpaque = false) {
      const dt = this.lastTime ? Math.min(0.05, Math.max(0.001, nowSec - this.lastTime)) : 0.016;
      this.lastTime = nowSec;
      const scale = Math.min(width, height) / 420;

      ctx.save();
      this._paintBackground(ctx, width, height, opts, forceOpaque);

      const style = opts.graphType || 'bar';
      switch (style) {
        case 'bar':
          this._drawBars(ctx, width, height, freqData, opts, scale);
          break;
        case 'mirrorBars':
          this._drawMirrorBars(ctx, width, height, freqData, opts, scale);
          break;
        case 'wave':
          this._drawWave(ctx, width, height, freqData, timeData, opts, scale);
          break;
        case 'line':
          this._drawLine(ctx, width, height, timeData, opts, scale);
          break;
        case 'radialBars':
          this._drawRadialBars(ctx, width, height, freqData, opts, scale);
          break;
        case 'mountain':
          this._drawMountain(ctx, width, height, freqData, opts, scale);
          break;
        case 'blob':
          this._drawBlob(ctx, width, height, freqData, opts, scale, nowSec);
          break;
        case 'siri':
          this._drawSiri(ctx, width, height, freqData, timeData, opts, scale, nowSec);
          break;
        case 'hexGrid':
          this._drawHexGrid(ctx, width, height, freqData, opts, scale, nowSec);
          break;
        case 'vinyl':
          this._drawVinyl(ctx, width, height, freqData, opts, scale, dt);
          break;
        case 'particleVortex':
          this._drawParticleVortex(ctx, width, height, freqData, opts, scale, dt, nowSec);
          break;
        case 'dotToDot':
          this._drawDotToDot(ctx, width, height, freqData, opts, scale, dt);
          break;
        case 'circularWave':
          this._drawCircularWave(ctx, width, height, freqData, timeData, opts, scale, nowSec);
          break;
        case 'spectrumRings':
          this._drawSpectrumRings(ctx, width, height, freqData, opts, scale, nowSec);
          break;
        case 'cyberHorizon':
          this._drawCyberHorizon(ctx, width, height, freqData, opts, scale, nowSec);
          break;
        case 'dnaHelix':
          this._drawDnaHelix(ctx, width, height, freqData, opts, scale, nowSec);
          break;
        case 'aurora':
          this._drawAurora(ctx, width, height, freqData, opts, scale, nowSec);
          break;
        case 'waterfall':
          this._drawWaterfall(ctx, width, height, freqData, opts);
          break;
        default:
          this._drawBars(ctx, width, height, freqData, opts, scale);
      }

      ctx.restore();
    }

    _drawBars(ctx, w, h, freq, opts, scale) {
      const barW = Math.max(1, (opts.barWidth || 6) * (w / 900));
      const gap = Math.max(0, (opts.gapWidth ?? 2) * (w / 900));
      const step = barW + gap;
      const padX = 24 * scale;
      const availW = Math.max(10, w - padX * 2);
      const count = Math.max(4, Math.floor(availW / step));
      const usableBins = Math.max(4, Math.floor(freq.length * 0.78));
      const totalWidth = count * step - gap;
      const startX = (w - totalWidth) / 2;
      const baseY = h - 22 * scale;
      const maxH = h - 48 * scale;
      const sens = opts.sensitivity || 1.4;

      if (this.peaks.length !== count) {
        this.peaks = new Array(count).fill(0);
      }

      this._applyGlow(ctx, opts, scale);
      const grad = this._makeLinearGradient(ctx, opts, startX, 0, startX + totalWidth, 0, 1);

      for (let i = 0; i < count; i++) {
        const binIdx = Math.min(usableBins - 1, Math.floor((i / count) * usableBins));
        const val = Math.min(1, (freq[binIdx] / 255) * sens);
        const barH = Math.max(2 * scale, val * maxH);
        const x = startX + i * step;
        const y = baseY - barH;

        ctx.fillStyle = opts.colorMode === 'solid' ? this._colorAt(opts, 0, 0.95) : grad;
        const radius = Math.min(barW / 2, 4 * scale);
        ctx.beginPath();
        ctx.roundRect(x, y, barW, barH, [radius, radius, 0, 0]);
        ctx.fill();

        // Peak cap
        if (barH > this.peaks[i]) {
          this.peaks[i] = barH;
        } else {
          this.peaks[i] = Math.max(barH, this.peaks[i] - 1.6 * scale);
        }
        ctx.fillStyle = this._colorAt(opts, i / count, 0.9);
        ctx.fillRect(x, baseY - this.peaks[i] - 3 * scale, barW, Math.max(1.5, 2 * scale));
      }
      this._clearGlow(ctx);
    }

    _drawMirrorBars(ctx, w, h, freq, opts, scale) {
      const barW = Math.max(1, (opts.barWidth || 6) * (w / 900));
      const gap = Math.max(0, (opts.gapWidth ?? 2) * (w / 900));
      const step = barW + gap;
      const padX = 24 * scale;
      const availW = Math.max(10, w - padX * 2);
      const count = Math.max(4, Math.floor(availW / step));
      const usableBins = Math.max(4, Math.floor(freq.length * 0.78));
      const totalWidth = count * step - gap;
      const startX = (w - totalWidth) / 2;
      const midY = h / 2;
      const maxHalfH = (h / 2) - 24 * scale;
      const sens = opts.sensitivity || 1.4;

      this._applyGlow(ctx, opts, scale);
      const grad = this._makeLinearGradient(ctx, opts, startX, 0, startX + totalWidth, 0, 1);

      for (let i = 0; i < count; i++) {
        const binIdx = Math.min(usableBins - 1, Math.floor((i / count) * usableBins));
        const val = Math.min(1, (freq[binIdx] / 255) * sens);
        const halfH = Math.max(2 * scale, val * maxHalfH);
        const x = startX + i * step;
        const r = Math.min(barW / 2, 4 * scale);

        ctx.fillStyle = opts.colorMode === 'solid' ? this._colorAt(opts, 0, 0.95) : grad;
        ctx.beginPath();
        ctx.roundRect(x, midY - halfH, barW, halfH, [r, r, 0, 0]);
        ctx.fill();

        ctx.save();
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        ctx.roundRect(x, midY + 1, barW, halfH, [0, 0, r, r]);
        ctx.fill();
        ctx.restore();
      }
      this._clearGlow(ctx);
    }

    _drawWave(ctx, w, h, freq, timeData, opts, scale) {
      const midY = h / 2;
      const sens = opts.sensitivity || 1.4;
      const len = timeData.length;
      const step = Math.max(1, Math.floor(len / 220));
      const points = [];

      for (let i = 0; i < len; i += step) {
        const x = (i / (len - 1)) * w;
        const norm = (timeData[i] - 128) / 128;
        const y = midY + norm * (h * 0.36) * sens;
        points.push({ x, y });
      }
      if (points.length < 2) return;

      this._applyGlow(ctx, opts, scale);
      const strokeGrad = this._makeLinearGradient(ctx, opts, 0, 0, w, 0, 1);
      const fillGrad = this._makeLinearGradient(ctx, opts, 0, midY - h * 0.35, 0, h, 0.32);

      // Filled wave ribbon
      ctx.beginPath();
      ctx.moveTo(points[0].x, midY);
      ctx.lineTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }
      const last = points[points.length - 1];
      ctx.lineTo(last.x, last.y);
      ctx.lineTo(last.x, midY);
      ctx.closePath();
      ctx.fillStyle = fillGrad;
      ctx.fill();

      // Crisp waveform stroke
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }
      ctx.lineTo(last.x, last.y);
      ctx.strokeStyle = strokeGrad;
      ctx.lineWidth = Math.max(2, 2.8 * scale);
      ctx.stroke();

      // Secondary mirrored subtle echo
      const energy = this._getEnergy(freq, 0, 0.25, sens);
      ctx.beginPath();
      ctx.moveTo(points[0].x, midY - (points[0].y - midY) * 0.5);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, midY - (points[i].y - midY) * (0.45 + energy * 0.2));
      }
      ctx.strokeStyle = this._makeLinearGradient(ctx, opts, 0, 0, w, 0, 0.38);
      ctx.lineWidth = Math.max(1.2, 1.6 * scale);
      ctx.stroke();

      this._clearGlow(ctx);
    }

    _drawLine(ctx, w, h, timeData, opts, scale) {
      const midY = h / 2;
      const sens = opts.sensitivity || 1.4;
      const len = timeData.length;
      const step = Math.max(1, Math.floor(len / 260));

      // Subtle center guide line
      ctx.save();
      ctx.strokeStyle = this._colorAt(opts, 0.5, 0.14);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(w, midY);
      ctx.stroke();
      ctx.restore();

      this._applyGlow(ctx, opts, scale);
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < len; i += step) {
        const x = (i / (len - 1)) * w;
        const norm = (timeData[i] - 128) / 128;
        const y = midY + norm * (h * 0.4) * sens;
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.strokeStyle = this._makeLinearGradient(ctx, opts, 0, 0, w, 0, 1);
      ctx.lineWidth = Math.max(2, 3 * scale);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
      this._clearGlow(ctx);
    }

    _drawRadialBars(ctx, w, h, freq, opts, scale) {
      const cx = w / 2;
      const cy = h / 2;
      const minDim = Math.min(w, h);
      const innerR = minDim * 0.18;
      const radialLen = opts.radialLength || 1.0;
      const maxBarH = minDim * 0.24 * radialLen;
      const sens = opts.sensitivity || 1.4;

      const barW = Math.max(1.5, (opts.barWidth || 6) * scale * 0.65);
      const gap = (opts.gapWidth ?? 2) * scale * 0.4;
      const circumference = 2 * Math.PI * innerR;
      const count = Math.max(24, Math.min(180, Math.floor(circumference / Math.max(3, barW + gap))));
      const usableBins = Math.max(8, Math.floor(freq.length * 0.75));

      // Center artwork or core circle
      const hasImg = this._drawCenterImage(ctx, cx, cy, innerR - 3 * scale, opts.centerImage, 0);
      if (!hasImg) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, innerR - 4 * scale, 0, Math.PI * 2);
        ctx.fillStyle = this._colorAt(opts, 0.2, 0.12);
        ctx.fill();
        ctx.strokeStyle = this._colorAt(opts, 0.4, 0.55);
        ctx.lineWidth = 2 * scale;
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, innerR - 2 * scale, 0, Math.PI * 2);
        ctx.strokeStyle = this._colorAt(opts, 0.4, 0.7);
        ctx.lineWidth = 2.5 * scale;
        ctx.stroke();
        ctx.restore();
      }

      this._applyGlow(ctx, opts, scale);
      for (let i = 0; i < count; i++) {
        // Mirror around the circle slightly for balanced symmetry
        const symIdx = i < count / 2 ? i : count - i;
        const binIdx = Math.min(usableBins - 1, Math.floor((symIdx / (count / 2)) * usableBins));
        const val = Math.min(1.2, (freq[binIdx] / 255) * sens);
        const barH = Math.max(3 * scale, val * maxBarH);
        const angle = (i / count) * Math.PI * 2 - Math.PI / 2;

        const x1 = cx + Math.cos(angle) * innerR;
        const y1 = cy + Math.sin(angle) * innerR;
        const x2 = cx + Math.cos(angle) * (innerR + barH);
        const y2 = cy + Math.sin(angle) * (innerR + barH);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = this._colorAt(opts, i / count, 0.95);
        ctx.lineWidth = barW;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
      this._clearGlow(ctx);
    }

    _drawMountain(ctx, w, h, freq, opts, scale) {
      const sens = opts.sensitivity || 1.4;
      const layers = [
        { start: 0.0, end: 0.22, base: 0.86, amp: 0.48, alpha: 0.28, colorT: 0.15 },
        { start: 0.12, end: 0.48, base: 0.9, amp: 0.38, alpha: 0.48, colorT: 0.5 },
        { start: 0.35, end: 0.78, base: 0.95, amp: 0.28, alpha: 0.78, colorT: 0.85 }
      ];

      layers.forEach((layer, li) => {
        const startBin = Math.floor(freq.length * layer.start);
        const endBin = Math.max(startBin + 8, Math.floor(freq.length * layer.end));
        const span = endBin - startBin;
        const steps = 48;
        const pts = [];

        for (let i = 0; i <= steps; i++) {
          const x = (i / steps) * w;
          // Create a mountain peak profile weighted toward center + frequency energy
          const idx = startBin + Math.floor((i / steps) * span);
          const v = Math.min(1.2, (freq[idx] / 255) * sens);
          const envelope = 0.35 + 0.65 * Math.sin((i / steps) * Math.PI);
          const ridge = v * envelope * h * layer.amp;
          const y = h * layer.base - ridge;
          pts.push({ x, y });
        }

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, h);
        ctx.lineTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length - 1; i++) {
          const xc = (pts[i].x + pts[i + 1].x) / 2;
          const yc = (pts[i].y + pts[i + 1].y) / 2;
          ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
        }
        ctx.lineTo(w, pts[pts.length - 1].y);
        ctx.lineTo(w, h);
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, h * 0.25, 0, h);
        grad.addColorStop(0, this._colorAt(opts, layer.colorT, layer.alpha));
        grad.addColorStop(1, this._colorAt(opts, layer.colorT, 0.05));
        ctx.fillStyle = grad;
        ctx.fill();

        if (li === layers.length - 1) this._applyGlow(ctx, opts, scale);
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length - 1; i++) {
          const xc = (pts[i].x + pts[i + 1].x) / 2;
          const yc = (pts[i].y + pts[i + 1].y) / 2;
          ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
        }
        ctx.strokeStyle = this._colorAt(opts, layer.colorT, 0.95);
        ctx.lineWidth = (2.2 - li * 0.2) * scale;
        ctx.stroke();
        ctx.restore();
      });
      this._clearGlow(ctx);
    }

    _drawBlob(ctx, w, h, freq, opts, scale, nowSec) {
      const cx = w / 2;
      const cy = h / 2;
      const minDim = Math.min(w, h);
      const radialLen = opts.radialLength || 1.0;
      const baseR = minDim * 0.22 * (0.85 + radialLen * 0.15);
      const sens = opts.sensitivity || 1.4;
      const pointsCount = Math.min(96, Math.max(24, Math.floor(freq.length * 0.45)));
      const bass = this._getEnergy(freq, 0, 0.12, sens);

      const pts = [];
      for (let i = 0; i < pointsCount; i++) {
        const angle = (i / pointsCount) * Math.PI * 2;
        // Symmetrical wrap so start & end meet seamlessly
        const sym = i <= pointsCount / 2 ? i : pointsCount - i;
        const binIdx = Math.floor((sym / (pointsCount / 2)) * (freq.length * 0.45));
        const val = (freq[binIdx] / 255) * sens;
        const organic = Math.sin(angle * 3 + nowSec * 1.6) * 8 * scale + Math.cos(angle * 5 - nowSec * 1.1) * 5 * scale;
        const r = baseR * (1 + bass * 0.16) + val * (minDim * 0.16 * radialLen) + organic;
        pts.push({
          x: cx + Math.cos(angle) * r,
          y: cy + Math.sin(angle) * r
        });
      }

      const drawClosedSmooth = (scaleMult, alphaFill, alphaStroke, lineW) => {
        ctx.beginPath();
        const scaledPts = pts.map((p) => ({
          x: cx + (p.x - cx) * scaleMult,
          y: cy + (p.y - cy) * scaleMult
        }));
        const n = scaledPts.length;
        const firstMidX = (scaledPts[n - 1].x + scaledPts[0].x) / 2;
        const firstMidY = (scaledPts[n - 1].y + scaledPts[0].y) / 2;
        ctx.moveTo(firstMidX, firstMidY);
        for (let i = 0; i < n; i++) {
          const curr = scaledPts[i];
          const next = scaledPts[(i + 1) % n];
          const mx = (curr.x + next.x) / 2;
          const my = (curr.y + next.y) / 2;
          ctx.quadraticCurveTo(curr.x, curr.y, mx, my);
        }
        ctx.closePath();

        if (alphaFill > 0) {
          const grad = ctx.createRadialGradient(cx, cy, baseR * 0.1, cx, cy, baseR * 1.9);
          grad.addColorStop(0, this._colorAt(opts, 0.15, alphaFill));
          grad.addColorStop(1, this._colorAt(opts, 0.85, alphaFill * 0.35));
          ctx.fillStyle = grad;
          ctx.fill();
        }
        if (alphaStroke > 0) {
          ctx.strokeStyle = this._makeLinearGradient(ctx, opts, cx - baseR, cy - baseR, cx + baseR, cy + baseR, alphaStroke);
          ctx.lineWidth = lineW * scale;
          ctx.stroke();
        }
      };

      this._applyGlow(ctx, opts, scale);
      drawClosedSmooth(1.08, 0.12, 0.35, 1.5);
      drawClosedSmooth(1.0, 0.35, 0.95, 2.8);
      drawClosedSmooth(0.72, 0.22, 0.5, 1.5);
      this._clearGlow(ctx);
    }

    _drawSiri(ctx, w, h, freq, timeData, opts, scale, nowSec) {
      const midY = h / 2;
      const sens = opts.sensitivity || 1.4;
      const bands = [
        { energy: this._getEnergy(freq, 0.0, 0.1, sens), freq: 1.8, speed: 2.2, colorT: 0.1, alpha: 0.85 },
        { energy: this._getEnergy(freq, 0.08, 0.28, sens), freq: 2.6, speed: -3.1, colorT: 0.38, alpha: 0.78 },
        { energy: this._getEnergy(freq, 0.25, 0.55, sens), freq: 3.5, speed: 4.0, colorT: 0.68, alpha: 0.72 },
        { energy: this._getEnergy(freq, 0.5, 0.85, sens), freq: 4.6, speed: -2.4, colorT: 0.92, alpha: 0.6 }
      ];

      ctx.save();
      ctx.globalCompositeOperation = opts.bgMode === 'light' ? 'source-over' : 'lighter';
      this._applyGlow(ctx, opts, scale);

      bands.forEach((b, idx) => {
        const amp = (12 + b.energy * h * 0.26) * Math.max(0.5, Math.min(1.8, sens * 0.85));
        ctx.beginPath();
        const samples = 140;
        for (let i = 0; i <= samples; i++) {
          const u = i / samples;
          const x = u * w;
          const envelope = Math.pow(Math.sin(u * Math.PI), 1.6);
          const timeIdx = Math.min(timeData.length - 1, Math.floor(u * (timeData.length - 1)));
          const timeMod = ((timeData[timeIdx] - 128) / 128) * 18 * scale * sens;
          const y =
            midY +
            (Math.sin(u * Math.PI * 2 * b.freq + nowSec * b.speed + idx) * amp + timeMod) * envelope;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = this._colorAt(opts, b.colorT, b.alpha);
        ctx.lineWidth = (3.2 - idx * 0.4) * scale;
        ctx.stroke();

        // Subtle ribbon fill
        ctx.lineTo(w, midY);
        ctx.lineTo(0, midY);
        ctx.closePath();
        ctx.fillStyle = this._colorAt(opts, b.colorT, 0.14);
        ctx.fill();
      });

      ctx.restore();
      this._clearGlow(ctx);
    }

    _drawHexGrid(ctx, w, h, freq, opts, scale, nowSec) {
      const gap = (opts.gapWidth ?? 2) * scale;
      const hexR = Math.max(14, (24 + (opts.barWidth || 6) * 0.8) * scale);
      const dx = hexR * Math.sqrt(3) + gap;
      const dy = hexR * 1.5 + gap * 0.85;
      const cols = Math.ceil(w / dx) + 2;
      const rows = Math.ceil(h / dy) + 2;
      const cx = w / 2;
      const cy = h / 2;
      const maxDist = Math.hypot(cx, cy) || 1;
      const sens = opts.sensitivity || 1.4;
      const usableBins = Math.max(8, Math.floor(freq.length * 0.7));

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c * dx + (r % 2 === 1 ? dx / 2 : 0) - hexR;
          const y = r * dy - hexR;
          const distNorm = Math.min(1, Math.hypot(x - cx, y - cy) / maxDist);
          const binIdx = Math.min(usableBins - 1, Math.floor(distNorm * usableBins));
          const energy = Math.min(1.2, (freq[binIdx] / 255) * sens);
          const pulse = 0.72 + Math.min(0.32, energy * 0.34);
          const radius = Math.max(4, (hexR - gap * 0.5) * pulse);

          ctx.beginPath();
          for (let k = 0; k < 6; k++) {
            const a = (Math.PI / 3) * k - Math.PI / 6;
            const px = x + Math.cos(a) * radius;
            const py = y + Math.sin(a) * radius;
            if (k === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();

          const colorT = (distNorm + nowSec * 0.08) % 1;
          ctx.fillStyle = this._colorAt(opts, colorT, 0.08 + Math.min(0.75, energy * 0.72));
          ctx.fill();
          ctx.strokeStyle = this._colorAt(opts, colorT, 0.22 + Math.min(0.78, energy * 0.75));
          ctx.lineWidth = Math.max(1, 1.4 * scale);
          ctx.stroke();
        }
      }
    }

    _drawVinyl(ctx, w, h, freq, opts, scale, dt) {
      const cx = w / 2;
      const cy = h / 2;
      const minDim = Math.min(w, h);
      const sens = opts.sensitivity || 1.4;
      const bass = this._getEnergy(freq, 0, 0.12, sens);
      const mid = this._getEnergy(freq, 0.12, 0.45, sens);

      const spinSpeed = opts.isPlaying ? 1.35 + bass * 0.4 : 0.18;
      this.vinylAngle += dt * spinSpeed;
      const targetArm = opts.isPlaying ? 1 : 0;
      this.tonearmProgress += (targetArm - this.tonearmProgress) * Math.min(1, dt * 5);

      const discR = minDim * 0.38 * (1 + bass * 0.035);
      const labelR = discR * 0.36;

      // Outer reactive aura ring
      this._applyGlow(ctx, opts, scale);
      ctx.beginPath();
      ctx.arc(cx, cy, discR + 8 * scale + bass * 14 * scale, 0, Math.PI * 2);
      ctx.strokeStyle = this._colorAt(opts, 0.35, 0.35 + Math.min(0.6, bass * 0.6));
      ctx.lineWidth = (2.5 + bass * 3) * scale;
      ctx.stroke();
      this._clearGlow(ctx);

      // Vinyl disc body
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(this.vinylAngle);

      const discGrad = ctx.createRadialGradient(0, 0, labelR, 0, 0, discR);
      discGrad.addColorStop(0, '#181a20');
      discGrad.addColorStop(0.5, '#0d0f14');
      discGrad.addColorStop(0.85, '#151821');
      discGrad.addColorStop(1, '#090b10');
      ctx.beginPath();
      ctx.arc(0, 0, discR, 0, Math.PI * 2);
      ctx.fillStyle = discGrad;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.16)';
      ctx.lineWidth = 1.5 * scale;
      ctx.stroke();

      // Grooves
      const grooveCount = 18;
      for (let i = 0; i < grooveCount; i++) {
        const r = labelR + 8 * scale + ((discR - labelR - 14 * scale) * i) / grooveCount;
        const bin = freq[Math.min(freq.length - 1, i * 3)] / 255;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,255,255,${0.04 + bin * 0.08 * sens})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Specular sheen wedges
      ctx.fillStyle = 'rgba(255,255,255,0.045)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, discR - 2 * scale, -0.35, 0.25);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, discR - 2 * scale, Math.PI - 0.35, Math.PI + 0.25);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Center Label (custom artwork or audvis label)
      const hasImg = this._drawCenterImage(ctx, cx, cy, labelR, opts.centerImage, this.vinylAngle);
      if (!hasImg) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(this.vinylAngle);
        const labelGrad = this._makeLinearGradient(ctx, opts, -labelR, -labelR, labelR, labelR, 0.95);
        ctx.beginPath();
        ctx.arc(0, 0, labelR, 0, Math.PI * 2);
        ctx.fillStyle = labelGrad;
        ctx.fill();

        ctx.fillStyle = 'rgba(11,13,18,0.85)';
        ctx.font = `700 ${Math.round(12 * scale)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('audvis', 0, -labelR * 0.42);
        ctx.restore();
      }

      // Spindle hole
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(4, 6.5 * scale), 0, Math.PI * 2);
      ctx.fillStyle = '#0b0d12';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1.5 * scale;
      ctx.stroke();

      // Tonearm
      const pivotX = cx + discR * 1.05;
      const pivotY = cy - discR * 0.85;
      const armLen = discR * 1.08;
      const restAngle = Math.PI * 0.72;
      const playAngle = Math.PI * 0.57 + mid * 0.025;
      const armAngle = restAngle + (playAngle - restAngle) * this.tonearmProgress;

      ctx.save();
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.82)';
      ctx.lineWidth = 4 * scale;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(pivotX, pivotY);
      const tipX = pivotX + Math.cos(armAngle) * armLen;
      const tipY = pivotY + Math.sin(armAngle) * armLen;
      ctx.lineTo(tipX, tipY);
      ctx.stroke();

      // Pivot base
      ctx.beginPath();
      ctx.arc(pivotX, pivotY, 10 * scale, 0, Math.PI * 2);
      ctx.fillStyle = '#334155';
      ctx.fill();
      ctx.strokeStyle = this._colorAt(opts, 0.5, 0.85);
      ctx.lineWidth = 2 * scale;
      ctx.stroke();

      // Cartridge head
      ctx.beginPath();
      ctx.arc(tipX, tipY, 5 * scale, 0, Math.PI * 2);
      ctx.fillStyle = this._colorAt(opts, 0.2, 1);
      ctx.fill();
      ctx.restore();
    }

    _drawParticleVortex(ctx, w, h, freq, opts, scale, dt, nowSec) {
      const cx = w / 2;
      const cy = h / 2;
      const maxR = Math.min(w, h) * 0.46;
      const sens = opts.sensitivity || 1.4;
      const bass = this._getEnergy(freq, 0, 0.14, sens);

      this._applyGlow(ctx, opts, scale);

      // Center core glow
      const coreGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 48 * scale * (1 + bass * 0.7));
      coreGrad.addColorStop(0, this._colorAt(opts, 0.2, 0.75));
      coreGrad.addColorStop(1, this._colorAt(opts, 0.8, 0));
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 48 * scale * (1 + bass * 0.7), 0, Math.PI * 2);
      ctx.fill();

      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        const energy = Math.min(1.2, (freq[p.band % freq.length] / 255) * sens);
        p.angle += dt * p.speed * (0.45 + bass * 1.9 + energy * 1.1);
        p.radiusNorm -= dt * (0.04 + bass * 0.08);
        if (p.radiusNorm < 0.06) {
          p.radiusNorm = 0.92 + Math.random() * 0.08;
        }
        const r = p.radiusNorm * maxR * (1 + energy * 0.18);
        const px = cx + Math.cos(p.angle) * r;
        const py = cy + Math.sin(p.angle) * r;
        const tailAngle = p.angle - 0.12 * (1 + bass);
        const tx = cx + Math.cos(tailAngle) * (r * 0.98);
        const ty = cy + Math.sin(tailAngle) * (r * 0.98);

        const col = this._colorAt(opts, (p.hueOffset + nowSec * 0.05) % 1, 0.4 + energy * 0.6);
        ctx.strokeStyle = col;
        ctx.lineWidth = p.size * scale * (0.65 + energy * 0.8);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(px, py);
        ctx.stroke();
      }
      this._clearGlow(ctx);
    }

    _drawDotToDot(ctx, w, h, freq, opts, scale, dt) {
      const sens = opts.sensitivity || 1.4;
      const energy = this._getEnergy(freq, 0, 0.35, sens);
      const connectDist = Math.min(w, h) * (0.22 + energy * 0.08);

      const coords = this.dots.map((d) => {
        const bin = Math.min(1.2, (freq[d.band % freq.length] / 255) * sens);
        const speedMult = 0.35 + energy * 1.6;
        d.x += d.vx * dt * speedMult;
        d.y += d.vy * dt * speedMult;
        if (d.x < 0.04 || d.x > 0.96) d.vx *= -1;
        if (d.y < 0.04 || d.y > 0.96) d.vy *= -1;
        d.x = Math.max(0.03, Math.min(0.97, d.x));
        d.y = Math.max(0.03, Math.min(0.97, d.y));
        return {
          x: d.x * w,
          y: d.y * h,
          bin
        };
      });

      // Edges
      for (let i = 0; i < coords.length; i++) {
        for (let j = i + 1; j < coords.length; j++) {
          const dist = Math.hypot(coords[i].x - coords[j].x, coords[i].y - coords[j].y);
          if (dist < connectDist) {
            const alpha = (1 - dist / connectDist) * (0.25 + energy * 0.55);
            ctx.beginPath();
            ctx.moveTo(coords[i].x, coords[i].y);
            ctx.lineTo(coords[j].x, coords[j].y);
            ctx.strokeStyle = this._colorAt(opts, (i + j) / (coords.length * 2), Math.min(0.9, alpha));
            ctx.lineWidth = Math.max(1, 1.3 * scale);
            ctx.stroke();
          }
        }
      }

      // Nodes
      this._applyGlow(ctx, opts, scale);
      for (let i = 0; i < coords.length; i++) {
        const c = coords[i];
        const r = (2.8 + c.bin * 6.5) * scale;
        ctx.beginPath();
        ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
        ctx.fillStyle = this._colorAt(opts, i / coords.length, 0.95);
        ctx.fill();
      }
      this._clearGlow(ctx);
    }

    _drawCircularWave(ctx, w, h, freq, timeData, opts, scale, nowSec) {
      const cx = w / 2;
      const cy = h / 2;
      const minDim = Math.min(w, h);
      const radialLen = opts.radialLength || 1.0;
      const baseR = minDim * 0.22;
      const sens = opts.sensitivity || 1.4;
      const points = 128;

      this._drawCenterImage(ctx, cx, cy, baseR - 6 * scale, opts.centerImage, nowSec * 0.25);

      this._applyGlow(ctx, opts, scale);
      for (let ring = 0; ring < 2; ring++) {
        ctx.beginPath();
        for (let i = 0; i <= points; i++) {
          const u = i / points;
          const angle = u * Math.PI * 2 - Math.PI / 2;
          const sym = i <= points / 2 ? i : points - i;
          const tIdx = Math.min(timeData.length - 1, Math.floor((sym / (points / 2)) * (timeData.length - 1)));
          const fIdx = Math.min(freq.length - 1, Math.floor((sym / (points / 2)) * (freq.length * 0.5)));
          const waveOffset = ((timeData[tIdx] - 128) / 128) * minDim * 0.14 * radialLen * sens;
          const freqOffset = (freq[fIdx] / 255) * minDim * 0.09 * radialLen * sens;
          const r = baseR + (ring === 0 ? waveOffset + freqOffset : -waveOffset * 0.5 + freqOffset * 0.5);
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = this._colorAt(opts, ring === 0 ? 0.2 : 0.75, ring === 0 ? 0.95 : 0.6);
        ctx.lineWidth = (ring === 0 ? 3 : 1.8) * scale;
        ctx.stroke();
      }
      this._clearGlow(ctx);
    }

    _drawSpectrumRings(ctx, w, h, freq, opts, scale, nowSec) {
      const cx = w / 2;
      const cy = h / 2;
      const minDim = Math.min(w, h);
      const radialLen = opts.radialLength || 1.0;
      const sens = opts.sensitivity || 1.4;
      const ringCount = 6;
      const baseStart = minDim * 0.12;
      const ringGap = (minDim * 0.30 * radialLen) / ringCount;

      this._drawCenterImage(ctx, cx, cy, baseStart - 4 * scale, opts.centerImage, 0);
      this._applyGlow(ctx, opts, scale);

      for (let i = 0; i < ringCount; i++) {
        const energy = this._getEnergy(freq, i / ringCount * 0.7, ((i + 1) / ringCount) * 0.75, sens);
        const r = baseStart + i * ringGap + energy * 10 * scale;
        const arcSpan = Math.PI * (0.65 + Math.min(1.25, energy * 1.1));
        const startA = nowSec * (i % 2 === 0 ? 1 : -1) * (0.5 + i * 0.15);

        // Background track
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = this._colorAt(opts, i / ringCount, 0.14);
        ctx.lineWidth = Math.max(2, (opts.barWidth || 6) * 0.65 * scale);
        ctx.stroke();

        // Active energy arc
        ctx.beginPath();
        ctx.arc(cx, cy, r, startA, startA + arcSpan);
        ctx.strokeStyle = this._colorAt(opts, i / ringCount, 0.95);
        ctx.lineWidth = Math.max(3, (opts.barWidth || 6) * 0.9 * scale);
        ctx.lineCap = 'round';
        ctx.stroke();
      }
      this._clearGlow(ctx);
    }

    _drawCyberHorizon(ctx, w, h, freq, opts, scale, nowSec) {
      const sens = opts.sensitivity || 1.4;
      const horizonY = h * 0.48;
      const bass = this._getEnergy(freq, 0, 0.14, sens);
      const sunR = Math.min(w, h) * 0.21 * (1 + bass * 0.08);

      // Sun behind horizon
      ctx.save();
      this._applyGlow(ctx, opts, scale);
      const sunGrad = this._makeLinearGradient(ctx, opts, w / 2, horizonY - sunR, w / 2, horizonY + sunR * 0.4, 0.95);
      ctx.beginPath();
      ctx.arc(w / 2, horizonY - sunR * 0.15, sunR, Math.PI, 0);
      ctx.closePath();
      ctx.fillStyle = sunGrad;
      ctx.fill();
      this._clearGlow(ctx);

      // Horizon audio mountain skyline
      const pts = 64;
      ctx.beginPath();
      ctx.moveTo(0, horizonY);
      for (let i = 0; i <= pts; i++) {
        const u = i / pts;
        const bin = Math.floor(Math.abs(u - 0.5) * 2 * (freq.length * 0.45));
        const val = Math.min(1.2, (freq[bin] / 255) * sens);
        const peak = val * h * 0.22 * (0.4 + Math.sin(u * Math.PI) * 0.8);
        ctx.lineTo(u * w, horizonY - peak);
      }
      ctx.lineTo(w, horizonY);
      ctx.closePath();
      ctx.fillStyle = this._colorAt(opts, 0.1, 0.35);
      ctx.fill();
      ctx.strokeStyle = this._colorAt(opts, 0.2, 0.95);
      ctx.lineWidth = 2 * scale;
      ctx.stroke();

      // Perspective Grid
      ctx.beginPath();
      ctx.rect(0, horizonY, w, h - horizonY);
      ctx.clip();

      const lines = 14;
      for (let i = -lines; i <= lines; i++) {
        const bottomX = w / 2 + i * (w / 10);
        ctx.beginPath();
        ctx.moveTo(w / 2 + i * 6 * scale, horizonY);
        ctx.lineTo(bottomX, h);
        ctx.strokeStyle = this._colorAt(opts, 0.65, 0.38);
        ctx.lineWidth = 1.2 * scale;
        ctx.stroke();
      }

      const hLines = 10;
      const scroll = (nowSec * (0.9 + bass * 1.4)) % 1;
      for (let i = 0; i < hLines; i++) {
        const t = ((i + scroll) / hLines);
        const y = horizonY + Math.pow(t, 2.2) * (h - horizonY);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.strokeStyle = this._colorAt(opts, 0.85, 0.18 + t * 0.55);
        ctx.lineWidth = (1 + t * 1.2) * scale;
        ctx.stroke();
      }
      ctx.restore();
    }

    _drawDnaHelix(ctx, w, h, freq, opts, scale, nowSec) {
      const sens = opts.sensitivity || 1.4;
      const nodes = 38;
      const padX = 36 * scale;
      const spanW = w - padX * 2;
      const midY = h / 2;
      const amp = h * 0.26;

      this._applyGlow(ctx, opts, scale);
      const strandA = [];
      const strandB = [];

      for (let i = 0; i < nodes; i++) {
        const u = i / (nodes - 1);
        const x = padX + u * spanW;
        const binIdx = Math.min(freq.length - 1, Math.floor(u * freq.length * 0.65));
        const val = Math.min(1.2, (freq[binIdx] / 255) * sens);
        const phase = u * Math.PI * 3.5 - nowSec * 2.6;
        const yOff = Math.sin(phase) * (amp * (0.45 + val * 0.65));
        const depth = Math.cos(phase);
        strandA.push({ x, y: midY + yOff, depth, val, u });
        strandB.push({ x, y: midY - yOff, depth: -depth, val, u });
      }

      // Rungs
      for (let i = 0; i < nodes; i++) {
        const a = strandA[i];
        const b = strandB[i];
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = this._colorAt(opts, a.u, 0.18 + Math.min(0.65, a.val * 0.55));
        ctx.lineWidth = (1.2 + a.val * 1.4) * scale;
        ctx.stroke();
      }

      // Strand curves & nodes
      [strandA, strandB].forEach((strand, si) => {
        ctx.beginPath();
        strand.forEach((p, idx) => {
          if (idx === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.strokeStyle = this._colorAt(opts, si === 0 ? 0.2 : 0.8, 0.85);
        ctx.lineWidth = 2.4 * scale;
        ctx.stroke();

        strand.forEach((p) => {
          const r = (3 + (p.depth + 1) * 1.8 + p.val * 3.5) * scale;
          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(1.5, r), 0, Math.PI * 2);
          ctx.fillStyle = this._colorAt(opts, p.u, 0.55 + (p.depth + 1) * 0.22);
          ctx.fill();
        });
      });

      this._clearGlow(ctx);
    }

    _drawAurora(ctx, w, h, freq, opts, scale, nowSec) {
      const sens = opts.sensitivity || 1.4;
      const curtains = 4;
      ctx.save();
      ctx.globalCompositeOperation = opts.bgMode === 'light' ? 'source-over' : 'lighter';

      for (let c = 0; c < curtains; c++) {
        const steps = 40;
        const baseY = h * (0.34 + c * 0.12);
        const startBin = Math.floor((c / curtains) * freq.length * 0.5);

        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let i = 0; i <= steps; i++) {
          const u = i / steps;
          const x = u * w;
          const bin = Math.min(freq.length - 1, startBin + Math.floor(u * freq.length * 0.25));
          const energy = Math.min(1.2, (freq[bin] / 255) * sens);
          const sway = Math.sin(u * 5 + nowSec * (0.9 + c * 0.25) + c) * 28 * scale;
          const y = baseY - energy * h * 0.24 + sway;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, baseY - h * 0.28, 0, h);
        grad.addColorStop(0, this._colorAt(opts, c / (curtains - 1), 0.52));
        grad.addColorStop(0.55, this._colorAt(opts, (c + 0.5) / curtains, 0.18));
        grad.addColorStop(1, this._colorAt(opts, 1, 0));
        ctx.fillStyle = grad;
        ctx.fill();
      }
      ctx.restore();
    }

    _drawWaterfall(ctx, w, h, freq, opts) {
      const iw = Math.max(120, Math.floor(w));
      const ih = Math.max(80, Math.floor(h));
      if (!this.waterfallCanvas || this.waterfallCanvas.width !== iw || this.waterfallCanvas.height !== ih) {
        this.waterfallCanvas = document.createElement('canvas');
        this.waterfallCanvas.width = iw;
        this.waterfallCanvas.height = ih;
        this.waterfallCtx = this.waterfallCanvas.getContext('2d');
      }

      const wctx = this.waterfallCtx;
      const shift = Math.max(2, Math.round(iw / 180));
      // Shift existing spectrogram left
      wctx.drawImage(this.waterfallCanvas, -shift, 0);

      // Paint new rightmost column
      const sens = opts.sensitivity || 1.4;
      const usableBins = Math.max(16, Math.floor(freq.length * 0.78));
      const colX = iw - shift;
      wctx.clearRect(colX, 0, shift, ih);

      const bands = Math.min(ih, 96);
      const cellH = ih / bands;
      for (let i = 0; i < bands; i++) {
        const binIdx = Math.min(usableBins - 1, Math.floor((i / bands) * usableBins));
        const val = Math.min(1, (freq[binIdx] / 255) * sens);
        const y = ih - (i + 1) * cellH;
        wctx.fillStyle = this._colorAt(opts, val, Math.max(0.06, Math.pow(val, 1.2)));
        wctx.fillRect(colX, y, shift, Math.ceil(cellH));
      }

      ctx.drawImage(this.waterfallCanvas, 0, 0, w, h);
    }
  }

  global.AudvisVisualizers = {
    CATALOG: VISUALIZER_CATALOG,
    PALETTES,
    AudvisRenderer
  };
})(window);
