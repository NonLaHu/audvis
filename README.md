# audvis

**audvis** is a local-first, zero-dependency browser audio visualizer and soundwave video generator. Load any audio track, trigger the built-in 118 BPM synth, or visualize a live microphone stream, tune the Web Audio DSP and color style, and export high-resolution **WebM** (with alpha transparency) or **MP4** videos directly in your browser.

No backend, no file uploads, no build step.

---

## Features

- **100% Client-Side**: Uses the Web Audio API (`AnalyserNode`), HTML5 Canvas 2D, and `MediaRecorder` locally in the browser.
- **18 Visualizer Engines** across 5 categories (`Bars`, `Waves`, `Radial`, `Geometric`, `Cosmic`).
- **Multiple Audio Sources**:
  - Drag-and-drop or open local audio files (`MP3`, `WAV`, `AAC`, `OGG`, `FLAC`, `M4A`, `WebM`).
  - Built-in procedural **Demo Synth** (`118 BPM`) to preview and export immediately without a file.
  - **Live Microphone** capture (`getUserMedia`, speaker output muted to prevent feedback).
- **Real-Time DSP & Geometry Controls**: Sensitivity (`0.2×`–`3.0×`), Smoothing (`0.00`–`0.95`), FFT Detail (`32`–`4096`), Bar Width, Gap, and Radial Scale.
- **Stage & Style Customization**:
  - 7 color modes (`Cyber Cyan`, `Neon Sunset`, `Emerald Pulse`, `Prism Rainbow`, `Rose Gold`, `Custom Duotone`, `Solid`).
  - Glow/Bloom intensity (`0%`–`100%`).
  - Background modes: `Transparent`, `Obsidian Dark`, `Studio Light`, or `Custom Color`.
  - Stage aspect ratio presets: `Auto`, `16:9`, `9:16`, `1:1`.
  - Custom **Center Artwork** upload for radial and vinyl visualizers.
- **Video Export Studio**:
  - **WebM (`VP9`)** with transparent background support and an inline EBML `Segment > Info > Duration` metadata patcher ([`js/webm-duration.js`](js/webm-duration.js)) for proper timeline scrubbing.
  - **MP4** recording where supported by the browser's `MediaRecorder`.
  - Resolution scaling (`1×`, `1.5×`, `2×`, `3×`) at `30` or `60 fps`.

---

## Visualizers (18)

| Category | Engines |
| --- | --- |
| **Bars** | `Frequency Bars`, `Mirror Bars`, `Spectrogram` |
| **Waves** | `Filled Wave`, `Oscilloscope`, `Siri Ribbons`, `Mountain Ridge`, `Aurora Curtains` |
| **Radial** | `Radial Bars`, `Polar Wave`, `Neon Rings`, `Organic Blob`, `Vinyl Record` |
| **Geometric** | `Hexagon Grid`, `Cyber Grid`, `Audio Helix` |
| **Cosmic** | `Particle Vortex`, `Dot to Dot` |

---

## Quick Start

Because `audvis` has zero build dependencies, you can run it directly:

1. **Open directly**: Open `index.html` in a modern Chromium, Firefox, or Safari browser.
2. **Or serve over HTTP** *(recommended for Microphone permissions)*:
   ```bash
   python3 -m http.server 8000
   ```
   Then visit `http://localhost:8000`.

---

## Keyboard Shortcuts

| Key | Action |
| --- | --- |
| `Space` | Play / Pause |
| `S` | Stop |
| `←` / `→` | Seek `-5s` / `+5s` |
| `M` | Mute / Unmute |

---

## Project Structure

```text
.
├── index.html             # App shell, SEO metadata, structured data
├── manifest.json          # Web app manifest
├── robots.txt             # Search engine crawl rules
├── sitemap.xml            # Sitemap for static hosting
├── LICENSE                # MIT License
├── README.md
├── assets/
│   ├── audvis-icon.svg    # App icon
│   └── og-image.png       # 1200x630 Open Graph preview image
├── css/
│   └── audvis.css         # Minimalist flat studio UI styles
└── js/
    ├── webm-duration.js   # EBML WebM duration metadata patcher
    ├── audio-engine.js    # Web Audio API, Demo Synth & Mic engine
    ├── visualizers.js     # 18 Canvas 2D visualizer renderers
    ├── exporter.js        # Offscreen scaled MediaRecorder exporter
    └── app.js             # UI wiring, preferences & animation loop
```

---

## License

[MIT](LICENSE) © 2026 NonLaHu
