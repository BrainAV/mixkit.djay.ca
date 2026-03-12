# Changelog

All notable changes to the DJay.ca MixKit (WEB) project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Fixed
- **SEO - Canonical Tag**: Added `<link rel="canonical" href="https://mixkit.djay.ca/">` to `index.html` to resolve the "Duplicate without user-selected canonical" warning in Google Search Console caused by GitHub Pages serving both `index.html` and `/` as separate URLs.

## [0.2.0] - 2026-03-08
### Added
- **Unified WebGL Visuals**:
  - **WebGL Waveform Engine**: GPU-accelerated rendering for deck waveforms with "Professional Imaging" progressive draw animation.
  - **WebGL VU Meters**: LED-style, GPU-accelerated deck metering with high-precision RMS tracking.
  - **WebGL Spectrum Analyzer**: High-speed master mixer visualization with peak-holding and dynamic gradients.
- **High-Performance Optimization (Batching)**:
  - **Geometric Batching**: Consolidated thousands of individual draw calls into optimized vertex batches, reducing CPU/GPU overhead by ~99%.
  - **Zero-Allocation Rendering**: Pre-allocated vertex buffers and typed arrays to eliminate garbage collection (GC) jank during playback.
- **Professional Audio Experience (Salvaged Features)**:
  - **Stutter-Cueing**: Audio feedback with 50ms "chattering" bursts for precise CUE point selection.
  - **Momentary Pitch Bend (Nudge)**: +/- buttons for temporary playback rate adjustments (pitch bending).
- **Settings & Persistence Layer**:
  - **Settings Overlay**: Slide-over modal for live-tuning (Tempo Range, Crossfader Curve, UI Theme).
  - **Tunable Crossfader Curves**: Added "Logarithmic" and "Exponential" curves alongside Linear and Constant Power.
  - **Pro Dark Theme**: High-contrast hardware aesthetic toggle.
  - **localStorage Persistence**: All user settings and session preferences now persist across browser restarts.
- **Advanced State/Audio Integration**: Decoupled high-frequency ephemeral audio feedback (Stutter) from main playback state.
- **New Specialized Agent Skills**: `console-assembler`, `midi-manager`, `render-performance`.
- **Comprehensive Documentation**: `DEVELOPER_GUIDE.md` and updated `ROADMAP.md`.

### Changed
- **Major Architectural Overhaul:** Modularized `app.js` into professional standard (`state.js`, `audio-engine.js`, `ui.js`, `main.js`).

### Fixed
- **Syntax & Logic Stability**: Resolved audio loading failures and state-sync bugs during WebGL migration.
- **Canvas Display Bugs**: Fixed infinite growth loop and sub-pixel jitter in high-DPI rendering.

## [0.1.0] - Initial Release
### Added
- DJay.ca MixKit (WEB) core functionality implemented.
- Pure HTML/CSS/JS frontend logic and styling.
- Local audio loading without the need for a web server.
- MP3 Metadata extraction via bundled `jsmediatags` library.
- Two-deck interface with standard DJ controls: Play, Pause, Stop, Loop, and Crossfader.
- Manual pitch / tempo adjust (+/- 8%) for manual beat-matching.
- Master output Spectrum Analyzer logic built on the Web Audio API.
- Session export functionality to JSON locally.
