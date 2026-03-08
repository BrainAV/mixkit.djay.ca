# Changelog

All notable changes to the DJay.ca MixKit (WEB) project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Added
- **Professional Audio Experience (Salvaged Features)**:
  - **Stutter-Cueing**: Audio feedback with 50ms "chattering" bursts for precise CUE point selection.
  - **Momentary Pitch Bend (Nudge)**: +/- buttons for temporary playback rate adjustments (pitch bending).
  - **Interactive Waveform Scrubbing**: Direct drag-to-seek functionality on the waveform canvas with audible feedback.
- **Advanced State/Audio Integration**: Decoupled high-frequency ephemeral audio feedback (Stutter) from main playback state for smoother performance.
- **New Specialized Agent Skills**:
  - `console-assembler`: Guidelines for Pro DJ UI assembly (Serato-style, stacked waveforms).
  - `midi-manager`: Standardized logic for Web MIDI API controller mapping.
- **Comprehensive Documentation**:
  - `DEVELOPER_GUIDE.md`: Deep dive into state management, audio routing, and UI rendering.
  - Refined `ROADMAP.md` and `README.md` for standalone repository clarity.
### Changed
- **Major Architectural Overhaul:** Refactored the core mechanism of `app.js` into modular pieces (`js/state.js`, `js/audio-engine.js`, `js/ui.js`, `js/main.js`). This implements the Advanced State Management (Pub/Sub) pattern, completely decoupling DOM mutations from the Audio Engine.
- **Standalone Sanitization**: Removed all external prototype references and absolute paths, making the repository completely self-contained.

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
