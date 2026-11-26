(function (global) {
  'use strict';

  const { CATALOG } = global.AudvisVisualizers;
  const Renderer = global.AudvisVisualizers.AudvisRenderer;
  const AudioEngine = global.AudvisAudioEngine;
  const Exporter = global.AudvisExporter;

  const STORAGE_KEY = 'audvis_prefs_v1';

  const els = {
    audioInput: document.getElementById('audioInput'),
    openAudioBtn: document.getElementById('openAudioBtn'),
    demoBtn: document.getElementById('demoBtn'),
    micBtn: document.getElementById('micBtn'),
    quickExportBtn: document.getElementById('quickExportBtn'),

    trackPill: document.getElementById('trackPill'),
    trackPillText: document.getElementById('trackPillText'),

    stageViewport: document.getElementById('stageViewport'),
    canvas: document.getElementById('visualizer'),
    dropOverlay: document.getElementById('dropOverlay'),
    stageEmptyBanner: document.getElementById('stageEmptyBanner'),
    hudModeName: document.getElementById('hudModeName'),
    hudFftBadge: document.getElementById('hudFftBadge'),
    hudToggleBtn: document.getElementById('hudToggleBtn'),
    fullscreenBtn: document.getElementById('fullscreenBtn'),
    stageHud: document.getElementById('stageHud'),

    exportOverlay: document.getElementById('exportOverlay'),
    exportTitle: document.getElementById('exportTitle'),
    exportProgress: document.getElementById('exportProgress'),
    exportProgressBar: document.getElementById('exportProgressBar'),
    exportStopSaveBtn: document.getElementById('exportStopSaveBtn'),
    exportCancelBtn: document.getElementById('exportCancelBtn'),

    playButton: document.getElementById('playButton'),
    playButtonLabel: document.getElementById('playButtonLabel'),
    playIcon: document.getElementById('playIcon'),
    stopButton: document.getElementById('stopButton'),
    back5Btn: document.getElementById('back5Btn'),
    fwd5Btn: document.getElementById('fwd5Btn'),
    seekTrack: document.getElementById('seekTrack'),
    progressBar: document.getElementById('progressBar'),
    timeCurrent: document.getElementById('timeCurrent'),
    timeRemaining: document.getElementById('timeRemaining'),
    status: document.getElementById('status'),
    muteBtn: document.getElementById('muteBtn'),
    volumeSlider: document.getElementById('volumeSlider'),

    categoryTabs: document.getElementById('categoryTabs'),
    presetGrid: document.getElementById('presetGrid'),
    aspectBtns: document.querySelectorAll('.aspect-btn'),

    // Inspector 1: Geometry & Audio
    sensitivity: document.getElementById('sensitivity'),
    sensitivityVal: document.getElementById('sensitivityVal'),
    smoothing: document.getElementById('smoothing'),
    smoothingVal: document.getElementById('smoothingVal'),
    fftSize: document.getElementById('fftSize'),
    fftSizeVal: document.getElementById('fftSizeVal'),
    barWidthContainer: document.getElementById('barWidthContainer'),
    barWidth: document.getElementById('barWidth'),
    barWidthVal: document.getElementById('barWidthVal'),
    gapContainer: document.getElementById('gapContainer'),
    gapWidth: document.getElementById('gapWidth'),
    gapWidthVal: document.getElementById('gapWidthVal'),
    radialLengthContainer: document.getElementById('radialLengthContainer'),
    radialLength: document.getElementById('radialLength'),
    radialLengthVal: document.getElementById('radialLengthVal'),
    smartTip: document.getElementById('smartTip'),

    // Inspector 2: Style & Stage
    colorMode: document.getElementById('colorMode'),
    graphColor: document.getElementById('graphColor'),
    secondaryColor: document.getElementById('secondaryColor'),
    secondaryColorWrap: document.getElementById('secondaryColorWrap'),
    glowSlider: document.getElementById('glowSlider'),
    glowVal: document.getElementById('glowVal'),
    bgMode: document.getElementById('bgMode'),
    bgCustomColorContainer: document.getElementById('bgCustomColorContainer'),
    bgCustomColor: document.getElementById('bgCustomColor'),
    radialImageContainer: document.getElementById('radialImageContainer'),
    radialImage: document.getElementById('radialImage'),
    clearCenterImageBtn: document.getElementById('clearCenterImageBtn'),
    centerImageLabel: document.getElementById('centerImageLabel'),

    // Inspector 3: Export
    exportFormat: document.getElementById('exportFormat'),
    exportScale: document.getElementById('exportScale'),
    exportFps: document.getElementById('exportFps'),
    exportFormatHint: document.getElementById('exportFormatHint'),
    exportButton: document.getElementById('exportButton'),
    exportButtonLabel: document.getElementById('exportButtonLabel')
  };

  const audioEngine = new AudioEngine();
  const previewRenderer = new Renderer();
  const exporter = new Exporter(audioEngine, Renderer);

  const state = {
    graphType: 'bar',
    activeCategory: 'all',
    aspect: 'auto',
    colorMode: 'cyber',
    primaryColor: '#38bdf8',
    secondaryColor: '#f472b6',
    glow: 0.45,
    bgMode: 'transparent',
    bgCustomColor: '#0b0d12',
    barWidth: 6,
    gapWidth: 2,
    sensitivity: 1.4,
    smoothing: 0.8,
    fftExp: 9,
    radialLength: 1.0,
    exportFormat: 'webm',
    exportScale: 2,
    exportFps: 60,
    centerImage: null,
    hudVisible: true
  };

  function formatTime(sec) {
    if (!Number.isFinite(sec) || sec < 0) sec = 0;
    const total = Math.floor(sec);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function loadPrefs() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      Object.keys(saved).forEach((k) => {
        if (k in state && k !== 'centerImage') {
          state[k] = saved[k];
        }
      });
    } catch (_e) {}
  }

  function savePrefs() {
    try {
      const toSave = { ...state };
      delete toSave.centerImage;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (_e) {}
  }

  function syncControlsFromState() {
    els.sensitivity.value = state.sensitivity;
    els.sensitivityVal.textContent = `${Number(state.sensitivity).toFixed(1)}×`;

    els.smoothing.value = state.smoothing;
    els.smoothingVal.textContent = Number(state.smoothing).toFixed(2);
    audioEngine.setSmoothing(state.smoothing);

    els.fftSize.value = state.fftExp;
    const fftActual = audioEngine.setFftExponent(state.fftExp);
    els.fftSizeVal.textContent = String(fftActual);
    els.hudFftBadge.textContent = `FFT ${fftActual}`;

    els.barWidth.value = state.barWidth;
    els.barWidthVal.textContent = String(state.barWidth);

    els.gapWidth.value = state.gapWidth;
    els.gapWidthVal.textContent = String(state.gapWidth);

    els.radialLength.value = state.radialLength;
    els.radialLengthVal.textContent = `${Number(state.radialLength).toFixed(1)}×`;

    els.colorMode.value = state.colorMode;
    els.graphColor.value = state.primaryColor;
    els.secondaryColor.value = state.secondaryColor;
    els.secondaryColorWrap.style.opacity = state.colorMode === 'duotone' ? '1' : '0.45';

    els.glowSlider.value = Math.round(state.glow * 100);
    els.glowVal.textContent = `${Math.round(state.glow * 100)}%`;

    els.bgMode.value = state.bgMode;
    els.bgCustomColor.value = state.bgCustomColor;
    els.bgCustomColorContainer.classList.toggle('hidden', state.bgMode !== 'custom');
    els.stageViewport.classList.toggle('checkerboard', state.bgMode === 'transparent');

    els.exportFormat.value = state.exportFormat;
    els.exportScale.value = String(state.exportScale);
    els.exportFps.value = String(state.exportFps);

    setAspectRatio(state.aspect, false);
    updateExportLabel();
    updateContextualControls();
  }

  function setAspectRatio(aspect, persist = true) {
    state.aspect = aspect;
    els.stageViewport.classList.remove('aspect-16-9', 'aspect-9-16', 'aspect-1-1');
    if (aspect === '16-9') els.stageViewport.classList.add('aspect-16-9');
    else if (aspect === '9-16') els.stageViewport.classList.add('aspect-9-16');
    else if (aspect === '1-1') els.stageViewport.classList.add('aspect-1-1');

    els.aspectBtns.forEach((b) => {
      b.classList.toggle('active', b.dataset.aspect === aspect);
    });
    resizeCanvas();
    if (persist) savePrefs();
  }

  function buildPresetGrid() {
    els.presetGrid.innerHTML = '';
    CATALOG.forEach((item) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'preset-card';
      btn.dataset.id = item.id;
      btn.dataset.category = item.category;

      const badge = item.isNew ? `<span class="preset-badge">new</span>` : '';
      btn.innerHTML = `
        <div class="preset-top">
          <span class="preset-name">${item.name}</span>
          ${badge}
        </div>
        <span class="preset-desc">${item.desc}</span>
      `;
      btn.addEventListener('click', () => selectVisualizer(item.id));
      els.presetGrid.appendChild(btn);
    });
    updatePresetSelectionUI();
  }

  function updatePresetSelectionUI() {
    const cards = els.presetGrid.querySelectorAll('.preset-card');
    cards.forEach((card) => {
      const matchCat = state.activeCategory === 'all' || card.dataset.category === state.activeCategory;
      card.classList.toggle('hidden', !matchCat);
      card.classList.toggle('active', card.dataset.id === state.graphType);
    });

    const meta = CATALOG.find((c) => c.id === state.graphType);
    if (meta) {
      els.hudModeName.textContent = meta.name;
    }
  }

  function selectVisualizer(id) {
    state.graphType = id;
    updatePresetSelectionUI();
    updateContextualControls();
    savePrefs();
  }

  function updateContextualControls() {
    const meta = CATALOG.find((c) => c.id === state.graphType) || CATALOG[0];
    els.barWidthContainer.classList.toggle('hidden', !meta.usesBarWidth);
    els.gapContainer.classList.toggle('hidden', !meta.usesGap);
    els.radialLengthContainer.classList.toggle('hidden', !meta.usesRadial);
    els.radialImageContainer.classList.toggle('hidden', !meta.usesCenterImage);

    if (meta.hint) {
      els.smartTip.textContent = meta.hint;
      els.smartTip.classList.remove('hidden');
    } else if (meta.usesCenterImage) {
      els.smartTip.textContent = `Tip: ${meta.name} supports custom Center Artwork in the Appearance panel.`;
      els.smartTip.classList.remove('hidden');
    } else {
      els.smartTip.classList.add('hidden');
    }
  }

  function updateExportLabel() {
    const fmt = state.exportFormat.toUpperCase();
    els.exportButtonLabel.textContent = `Export ${fmt}`;
    const supported = exporter.isFormatSupported(state.exportFormat);
    if (state.exportFormat === 'webm') {
      els.exportFormatHint.textContent = supported
        ? 'VP9 WebM supports transparent backgrounds for video overlays.'
        : 'WebM recording unavailable in this browser.';
    } else {
      els.exportFormatHint.textContent = supported
        ? 'MP4 works natively in video editors & Safari (opaque background).'
        : 'MP4 recording is unsupported in this browser — use WebM instead.';
    }
  }

  function updateTransportUI(engineState) {
    const hasAudio = engineState.hasAudio;
    const isFile = engineState.mode === 'file';
    const isPlaying = engineState.isPlaying;

    els.playButton.disabled = !hasAudio;
    els.stopButton.disabled = !hasAudio;
    els.back5Btn.disabled = !isFile;
    els.fwd5Btn.disabled = !isFile;
    els.exportButton.disabled = !hasAudio || exporter.isExporting;
    els.quickExportBtn.disabled = !hasAudio || exporter.isExporting;

    els.demoBtn.classList.toggle('btn-active', engineState.mode === 'demo' && isPlaying);
    els.micBtn.classList.toggle('btn-active', engineState.mode === 'mic' && isPlaying);

    els.stageEmptyBanner.classList.toggle('hidden', hasAudio);
    els.trackPill.classList.toggle('is-live', isPlaying);
    els.trackPillText.textContent = hasAudio ? engineState.trackName : 'Idle Preview • No Track';

    if (isPlaying) {
      els.playButtonLabel.textContent = engineState.mode === 'mic' ? 'Live' : 'Pause';
      els.playIcon.innerHTML = '<path d="M6 5h4v14H6zm8 0h4v14h-4z"/>';
    } else {
      els.playButtonLabel.textContent = 'Play';
      els.playIcon.innerHTML = '<path d="M8 5v14l11-7z"/>';
    }

    if (!hasAudio) {
      els.status.textContent = 'Showing ambient preview — load an audio file, Demo Synth, or Mic.';
    } else if (engineState.mode === 'mic') {
      els.status.textContent = 'Capturing live microphone input (speaker output muted to avoid echo).';
    } else if (engineState.mode === 'demo') {
      els.status.textContent = isPlaying ? 'Playing procedural audvis Demo Synth (118 BPM).' : 'Demo Synth paused.';
    } else {
      els.status.textContent = isPlaying ? `Playing: ${engineState.trackName}` : `Ready: ${engineState.trackName}`;
    }

    els.muteBtn.textContent = engineState.muted ? 'Unmute' : 'Mute';
  }

  function updateTimeline() {
    const s = audioEngine.getState();
    if (s.mode === 'file' && s.duration > 0) {
      const cur = s.currentTime;
      const rem = Math.max(0, s.duration - cur);
      const pct = Math.min(100, Math.max(0, (cur / s.duration) * 100));
      els.timeCurrent.textContent = formatTime(cur);
      els.timeRemaining.textContent = `-${formatTime(rem)}`;
      els.progressBar.style.width = `${pct}%`;
    } else if (s.mode === 'demo') {
      els.timeCurrent.textContent = formatTime(s.currentTime);
      els.timeRemaining.textContent = 'LIVE';
      els.progressBar.style.width = s.isPlaying ? '100%' : '0%';
    } else if (s.mode === 'mic') {
      els.timeCurrent.textContent = 'LIVE';
      els.timeRemaining.textContent = 'MIC';
      els.progressBar.style.width = '100%';
    } else {
      els.timeCurrent.textContent = '0:00';
      els.timeRemaining.textContent = '-0:00';
      els.progressBar.style.width = '0%';
    }
  }

  // Canvas HiDPI resizing
  let canvasCssWidth = 960;
  let canvasCssHeight = 440;
  const ctx = els.canvas.getContext('2d', { alpha: true });

  function resizeCanvas() {
    const rect = els.stageViewport.getBoundingClientRect();
    const dpr = Math.min(2, global.devicePixelRatio || 1);
    canvasCssWidth = Math.max(300, Math.round(rect.width));
    canvasCssHeight = Math.max(200, Math.round(rect.height));
    els.canvas.width = Math.round(canvasCssWidth * dpr);
    els.canvas.height = Math.round(canvasCssHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  const ro = new ResizeObserver(resizeCanvas);
  ro.observe(els.stageViewport);

  function getRenderOptions() {
    return {
      graphType: state.graphType,
      colorMode: state.colorMode,
      primaryColor: state.primaryColor,
      secondaryColor: state.secondaryColor,
      glow: state.glow,
      bgMode: state.bgMode,
      bgCustomColor: state.bgCustomColor,
      barWidth: Number(state.barWidth),
      gapWidth: Number(state.gapWidth),
      sensitivity: Number(state.sensitivity),
      radialLength: Number(state.radialLength),
      centerImage: state.centerImage,
      isPlaying: audioEngine.isPlaying
    };
  }

  function animate() {
    const nowSec = performance.now() / 1000;
    const { freqData, timeData } = audioEngine.sample(nowSec);
    previewRenderer.render(ctx, canvasCssWidth, canvasCssHeight, freqData, timeData, getRenderOptions(), nowSec, false);
    updateTimeline();
    requestAnimationFrame(animate);
  }

  async function handleAudioFile(file) {
    if (!file) return;
    if (!file.type.startsWith('audio/') && !/\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i.test(file.name)) {
      els.status.textContent = 'Please select a valid audio file (MP3, WAV, AAC, OGG, FLAC).';
      return;
    }
    try {
      await audioEngine.loadFile(file);
      updateTransportUI(audioEngine.getState());
    } catch (err) {
      els.status.textContent = err?.message || 'Failed to load audio file.';
    }
  }

  function startExportFlow() {
    const s = audioEngine.getState();
    if (!s.hasAudio || exporter.isExporting) return;

    const isLive = s.mode !== 'file';
    els.exportOverlay.classList.remove('hidden');
    els.exportTitle.textContent = `Exporting ${state.exportFormat.toUpperCase()}…`;
    els.exportProgress.textContent = 'Initializing encoder…';
    els.exportProgressBar.style.width = '0%';
    els.exportStopSaveBtn.classList.toggle('hidden', !isLive);
    updateTransportUI(audioEngine.getState());

    exporter.startExport({
      previewCanvas: els.canvas,
      getOptions: getRenderOptions,
      scale: Number(state.exportScale),
      fps: Number(state.exportFps),
      format: state.exportFormat,
      onProgress: (p) => {
        if (p.isLiveCapture) {
          els.exportProgress.textContent = `Recording live ${p.resolution} • ${formatTime(p.current)}`;
          els.exportProgressBar.style.width = '100%';
        } else {
          els.exportProgress.textContent = `${Math.round(p.percent)}% • ${formatTime(p.current)} / ${formatTime(p.total)} (${p.resolution})`;
          els.exportProgressBar.style.width = `${p.percent}%`;
        }
      },
      onComplete: (fileName, byteSize) => {
        els.exportOverlay.classList.add('hidden');
        const mb = (byteSize / (1024 * 1024)).toFixed(2);
        els.status.textContent = `Exported ${fileName} (${mb} MB).`;
        updateTransportUI(audioEngine.getState());
      },
      onError: (msg) => {
        els.exportOverlay.classList.add('hidden');
        els.status.textContent = msg;
        updateTransportUI(audioEngine.getState());
      }
    });
  }

  // Event Wiring
  audioEngine.onStateChange = updateTransportUI;
  audioEngine.onError = (msg) => {
    els.status.textContent = msg;
  };

  els.openAudioBtn.addEventListener('click', () => els.audioInput.click());
  els.audioInput.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) handleAudioFile(file);
  });

  els.demoBtn.addEventListener('click', async () => {
    const s = audioEngine.getState();
    if (s.mode === 'demo' && s.isPlaying) {
      audioEngine.pause();
    } else {
      await audioEngine.startDemoSynth();
    }
  });

  els.micBtn.addEventListener('click', async () => {
    const s = audioEngine.getState();
    if (s.mode === 'mic' && s.isPlaying) {
      audioEngine.stop();
      return;
    }
    try {
      await audioEngine.startMic();
    } catch (err) {
      els.status.textContent = err?.message || 'Microphone permission denied.';
    }
  });

  els.playButton.addEventListener('click', () => audioEngine.togglePlayPause());
  els.stopButton.addEventListener('click', () => audioEngine.stop());
  els.back5Btn.addEventListener('click', () => audioEngine.seekRelative(-5));
  els.fwd5Btn.addEventListener('click', () => audioEngine.seekRelative(5));

  els.muteBtn.addEventListener('click', () => {
    audioEngine.setMuted(!audioEngine.muted);
  });

  els.volumeSlider.addEventListener('input', (e) => {
    audioEngine.setVolume(Number(e.target.value));
  });

  // Seek bar interaction
  let isSeeking = false;
  function seekFromPointer(clientX) {
    const dur = audioEngine.getDuration();
    if (dur <= 0) return;
    const rect = els.seekTrack.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    audioEngine.seek(ratio * dur);
  }
  els.seekTrack.addEventListener('pointerdown', (e) => {
    if (audioEngine.mode !== 'file') return;
    isSeeking = true;
    seekFromPointer(e.clientX);
  });
  global.addEventListener('pointermove', (e) => {
    if (isSeeking) seekFromPointer(e.clientX);
  });
  global.addEventListener('pointerup', () => {
    isSeeking = false;
  });

  // Category filter tabs
  els.categoryTabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.cat-tab');
    if (!btn) return;
    state.activeCategory = btn.dataset.cat;
    els.categoryTabs.querySelectorAll('.cat-tab').forEach((t) => t.classList.toggle('active', t === btn));
    updatePresetSelectionUI();
    savePrefs();
  });

  // Aspect ratio buttons
  els.aspectBtns.forEach((btn) => {
    btn.addEventListener('click', () => setAspectRatio(btn.dataset.aspect));
  });

  // HUD & Fullscreen
  els.hudToggleBtn.addEventListener('click', () => {
    state.hudVisible = !state.hudVisible;
    els.hudModeName.parentElement.style.opacity = state.hudVisible ? '1' : '0.18';
    els.hudToggleBtn.textContent = state.hudVisible ? 'Dim HUD' : 'Show HUD';
  });

  els.fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      els.stageViewport.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.();
    }
  });

  // Inspector controls
  els.sensitivity.addEventListener('input', (e) => {
    state.sensitivity = Number(e.target.value);
    els.sensitivityVal.textContent = `${state.sensitivity.toFixed(1)}×`;
    savePrefs();
  });

  els.smoothing.addEventListener('input', (e) => {
    state.smoothing = Number(e.target.value);
    els.smoothingVal.textContent = state.smoothing.toFixed(2);
    audioEngine.setSmoothing(state.smoothing);
    savePrefs();
  });

  els.fftSize.addEventListener('input', (e) => {
    state.fftExp = Number(e.target.value);
    const val = audioEngine.setFftExponent(state.fftExp);
    els.fftSizeVal.textContent = String(val);
    els.hudFftBadge.textContent = `FFT ${val}`;
    savePrefs();
  });

  els.barWidth.addEventListener('input', (e) => {
    state.barWidth = Number(e.target.value);
    els.barWidthVal.textContent = String(state.barWidth);
    savePrefs();
  });

  els.gapWidth.addEventListener('input', (e) => {
    state.gapWidth = Number(e.target.value);
    els.gapWidthVal.textContent = String(state.gapWidth);
    savePrefs();
  });

  els.radialLength.addEventListener('input', (e) => {
    state.radialLength = Number(e.target.value);
    els.radialLengthVal.textContent = `${state.radialLength.toFixed(1)}×`;
    savePrefs();
  });

  els.colorMode.addEventListener('change', (e) => {
    state.colorMode = e.target.value;
    els.secondaryColorWrap.style.opacity = state.colorMode === 'duotone' ? '1' : '0.45';
    savePrefs();
  });

  els.graphColor.addEventListener('input', (e) => {
    state.primaryColor = e.target.value;
    savePrefs();
  });

  els.secondaryColor.addEventListener('input', (e) => {
    state.secondaryColor = e.target.value;
    if (state.colorMode !== 'duotone') {
      state.colorMode = 'duotone';
      els.colorMode.value = 'duotone';
      els.secondaryColorWrap.style.opacity = '1';
    }
    savePrefs();
  });

  els.glowSlider.addEventListener('input', (e) => {
    const pct = Number(e.target.value);
    state.glow = pct / 100;
    els.glowVal.textContent = `${pct}%`;
    savePrefs();
  });

  els.bgMode.addEventListener('change', (e) => {
    state.bgMode = e.target.value;
    els.bgCustomColorContainer.classList.toggle('hidden', state.bgMode !== 'custom');
    els.stageViewport.classList.toggle('checkerboard', state.bgMode === 'transparent');
    savePrefs();
  });

  els.bgCustomColor.addEventListener('input', (e) => {
    state.bgCustomColor = e.target.value;
    savePrefs();
  });

  els.radialImage.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        state.centerImage = img;
        els.centerImageLabel.textContent = file.name;
        els.clearCenterImageBtn.classList.remove('hidden');
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

  els.clearCenterImageBtn.addEventListener('click', () => {
    state.centerImage = null;
    els.radialImage.value = '';
    els.centerImageLabel.textContent = 'Upload Center Art';
    els.clearCenterImageBtn.classList.add('hidden');
  });

  // Export controls
  els.exportFormat.addEventListener('change', (e) => {
    state.exportFormat = e.target.value;
    updateExportLabel();
    savePrefs();
  });

  els.exportScale.addEventListener('change', (e) => {
    state.exportScale = Number(e.target.value);
    savePrefs();
  });

  els.exportFps.addEventListener('change', (e) => {
    state.exportFps = Number(e.target.value);
    savePrefs();
  });

  els.exportButton.addEventListener('click', startExportFlow);
  els.quickExportBtn.addEventListener('click', startExportFlow);
  els.exportCancelBtn.addEventListener('click', () => exporter.cancelExport());
  els.exportStopSaveBtn.addEventListener('click', () => exporter.stopAndSaveLiveExport());

  // Drag & Drop audio onto stage
  let dragDepth = 0;
  ['dragenter', 'dragover'].forEach((evtName) => {
    document.addEventListener(evtName, (e) => {
      e.preventDefault();
      if (evtName === 'dragenter') dragDepth++;
      els.dropOverlay.classList.add('active');
    });
  });
  ['dragleave', 'drop'].forEach((evtName) => {
    document.addEventListener(evtName, (e) => {
      e.preventDefault();
      if (evtName === 'dragleave') dragDepth = Math.max(0, dragDepth - 1);
      else dragDepth = 0;
      if (dragDepth === 0) els.dropOverlay.classList.remove('active');
    });
  });
  document.addEventListener('drop', (e) => {
    const file = e.dataTransfer?.files?.[0];
    if (file) handleAudioFile(file);
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    const tag = (e.target?.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'select' || tag === 'textarea') {
      if (e.target.type !== 'range' && e.target.type !== 'file') return;
      if (e.code === 'Space' && e.target.type === 'range') return;
    }

    if (e.code === 'Space') {
      e.preventDefault();
      audioEngine.togglePlayPause();
    } else if (e.key === 's' || e.key === 'S') {
      e.preventDefault();
      audioEngine.stop();
    } else if (e.key === 'm' || e.key === 'M') {
      e.preventDefault();
      audioEngine.setMuted(!audioEngine.muted);
    } else if (e.code === 'ArrowLeft') {
      audioEngine.seekRelative(-5);
    } else if (e.code === 'ArrowRight') {
      audioEngine.seekRelative(5);
    }
  });

  function applyQueryParams() {
    try {
      const params = new URLSearchParams(global.location.search);
      const style = params.get('style');
      if (style && CATALOG.some((c) => c.id === style)) {
        state.graphType = style;
      }
      const bg = params.get('bg');
      if (bg && ['transparent', 'dark', 'light', 'custom'].includes(bg)) {
        state.bgMode = bg;
      }
      const palette = params.get('palette');
      if (palette && ['cyber', 'sunset', 'emerald', 'prism', 'rosegold', 'duotone', 'solid'].includes(palette)) {
        state.colorMode = palette;
      }
      const aspect = params.get('aspect');
      if (aspect && ['auto', '16-9', '9-16', '1-1'].includes(aspect)) {
        state.aspect = aspect;
      }
      const format = params.get('format');
      if (format && ['webm', 'mp4'].includes(format)) {
        state.exportFormat = format;
      }
    } catch (_e) {}
  }

  // Boot
  loadPrefs();
  applyQueryParams();
  buildPresetGrid();
  syncControlsFromState();
  resizeCanvas();
  updateTransportUI(audioEngine.getState());
  requestAnimationFrame(animate);
})(window);
