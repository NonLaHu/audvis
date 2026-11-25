(function (global) {
  'use strict';

  function pickMimeType(format) {
    if (typeof MediaRecorder === 'undefined') {
      return { mimeType: '', supported: false };
    }
    const candidates = format === 'mp4'
      ? [
          'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
          'video/mp4;codecs=avc1.4d401f,mp4a.40.2',
          'video/mp4;codecs=avc1,mp4a',
          'video/mp4'
        ]
      : [
          'video/webm;codecs=vp9,opus',
          'video/webm;codecs=vp8,opus',
          'video/webm;codecs=vp9',
          'video/webm'
        ];

    for (const mime of candidates) {
      if (MediaRecorder.isTypeSupported(mime)) {
        return { mimeType: mime, supported: true };
      }
    }
    return { mimeType: '', supported: false };
  }

  class AudvisExporter {
    constructor(audioEngine, rendererClass) {
      this.audioEngine = audioEngine;
      this.RendererClass = rendererClass;
      this.isExporting = false;
      this._cancelled = false;
      this._recorder = null;
      this._rafId = null;
      this._cleanup = null;
    }

    isFormatSupported(format) {
      return pickMimeType(format).supported;
    }

    async startExport({
      previewCanvas,
      getOptions,
      scale = 2,
      fps = 60,
      format = 'webm',
      onProgress,
      onComplete,
      onError
    }) {
      if (this.isExporting) return;

      const state = this.audioEngine.getState();
      if (!state.hasAudio) {
        onError?.('Load an audio file, start Demo Synth, or enable Microphone before exporting.');
        return;
      }

      const { mimeType, supported } = pickMimeType(format);
      if (!supported) {
        onError?.(
          format === 'mp4'
            ? 'MP4 recording is not supported in this browser. Switch Export Format to WebM.'
            : 'WebM MediaRecorder is not supported in this browser.'
        );
        return;
      }

      this.isExporting = true;
      this._cancelled = false;

      const rect = previewCanvas.getBoundingClientRect();
      const baseW = Math.max(320, Math.round(rect.width || previewCanvas.width || 1280));
      const baseH = Math.max(180, Math.round(rect.height || previewCanvas.height || 720));

      // Codecs require even pixel dimensions
      const exportW = Math.max(2, Math.floor((baseW * scale) / 2) * 2);
      const exportH = Math.max(2, Math.floor((baseH * scale) / 2) * 2);

      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = exportW;
      exportCanvas.height = exportH;
      const exportCtx = exportCanvas.getContext('2d', { alpha: format === 'webm' });

      const exportRenderer = new this.RendererClass();
      const videoStream = exportCanvas.captureStream(fps);
      const audioStream = this.audioEngine.getExportAudioStream();

      const combinedStream = new MediaStream();
      videoStream.getVideoTracks().forEach((t) => combinedStream.addTrack(t));
      if (audioStream) {
        audioStream.getAudioTracks().forEach((t) => combinedStream.addTrack(t));
      }

      const chunks = [];
      const bitrate = Math.min(18_000_000, Math.max(4_000_000, Math.round(exportW * exportH * 4)));
      let recorder;
      try {
        recorder = new MediaRecorder(combinedStream, {
          mimeType,
          videoBitsPerSecond: bitrate
        });
      } catch (_err) {
        recorder = new MediaRecorder(combinedStream);
      }
      this._recorder = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      const startTimeMs = performance.now();
      const isFileMode = state.mode === 'file';
      const totalDuration = isFileMode ? this.audioEngine.getDuration() : 0;

      const finishRecording = (shouldSave) => {
        if (this._rafId) {
          cancelAnimationFrame(this._rafId);
          this._rafId = null;
        }
        if (this._cleanup) {
          this._cleanup();
          this._cleanup = null;
        }
        videoStream.getTracks().forEach((t) => t.stop());

        if (!shouldSave || this._cancelled) {
          this.isExporting = false;
          onError?.('Export cancelled.');
          return;
        }

        recorder.onstop = async () => {
          try {
            const elapsedMs = performance.now() - startTimeMs;
            const rawBlob = new Blob(chunks, { type: mimeType || (format === 'mp4' ? 'video/mp4' : 'video/webm') });
            let finalBlob = rawBlob;
            if (format === 'webm' && global.AudvisWebm?.fixWebmDuration) {
              const durMs = isFileMode && totalDuration > 0 ? totalDuration * 1000 : elapsedMs;
              finalBlob = await global.AudvisWebm.fixWebmDuration(rawBlob, durMs);
            }

            const baseName = (state.trackName || 'audvis-track')
              .replace(/\.[^/.]+$/, '')
              .replace(/[^a-z0-9-_]+/gi, '-')
              .replace(/^-|-$/g, '')
              .toLowerCase() || 'audvis';
            const styleName = getOptions().graphType || 'visual';
            const fileName = `audvis-${baseName}-${styleName}.${format}`;

            const url = URL.createObjectURL(finalBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 10_000);

            this.isExporting = false;
            onComplete?.(fileName, finalBlob.size);
          } catch (err) {
            this.isExporting = false;
            onError?.(err?.message || 'Failed to finalize exported video.');
          }
        };

        if (recorder.state !== 'inactive') {
          recorder.stop();
        }
      };

      recorder.onerror = () => {
        finishRecording(false);
        onError?.('MediaRecorder encountered an encoding error.');
      };

      // Rewind file to start & play
      if (isFileMode) {
        this.audioEngine.stop();
        this.audioEngine.seek(0);
      }

      const onFileEnded = () => {
        finishRecording(true);
      };
      if (isFileMode) {
        this.audioEngine.audioEl.addEventListener('ended', onFileEnded, { once: true });
        this._cleanup = () => {
          this.audioEngine.audioEl.removeEventListener('ended', onFileEnded);
        };
      }

      this._finishSave = () => finishRecording(true);
      this._finishCancel = () => {
        this._cancelled = true;
        if (isFileMode) this.audioEngine.pause();
        finishRecording(false);
      };

      try {
        recorder.start(250);
        await this.audioEngine.play();
      } catch (err) {
        this.isExporting = false;
        onError?.(err?.message || 'Could not start audio playback for export.');
        return;
      }

      const drawFrame = () => {
        if (!this.isExporting || this._cancelled) return;
        const nowSec = performance.now() / 1000;
        const opts = getOptions();
        opts.isPlaying = this.audioEngine.isPlaying;
        const { freqData, timeData } = this.audioEngine.sample(nowSec);
        const forceOpaque = format === 'mp4';

        exportRenderer.render(exportCtx, exportW, exportH, freqData, timeData, opts, nowSec, forceOpaque);

        if (isFileMode && totalDuration > 0) {
          const cur = this.audioEngine.getCurrentTime();
          const pct = Math.max(0, Math.min(100, (cur / totalDuration) * 100));
          onProgress?.({
            percent: pct,
            current: cur,
            total: totalDuration,
            resolution: `${exportW}×${exportH}`,
            isLiveCapture: false
          });
        } else {
          const elapsed = (performance.now() - startTimeMs) / 1000;
          onProgress?.({
            percent: 100,
            current: elapsed,
            total: 0,
            resolution: `${exportW}×${exportH}`,
            isLiveCapture: true
          });
        }

        this._rafId = requestAnimationFrame(drawFrame);
      };

      this._rafId = requestAnimationFrame(drawFrame);
    }

    stopAndSaveLiveExport() {
      if (this.isExporting && typeof this._finishSave === 'function') {
        this._finishSave();
      }
    }

    cancelExport() {
      if (this.isExporting && typeof this._finishCancel === 'function') {
        this._finishCancel();
      }
    }
  }

  global.AudvisExporter = AudvisExporter;
})(window);
