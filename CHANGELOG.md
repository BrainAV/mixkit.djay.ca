# Changelog

All notable changes to the DJay.ca MixKit (WEB) project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Added
- Created `ROADMAP.md` to outline future development plans and feature enhancements.
- Initial `.agent/skills/` infrastructure to maintain consistent code quality, UI glassmorphism rules, Web Audio API efficiency, and automated release strategies.
### Changed
- **Major Architectural Overhaul:** Refactored the core mechanism of `app.js` into modular pieces (`js/state.js`, `js/audio-engine.js`, `js/ui.js`, `js/main.js`). This implements the Advanced State Management (Pub/Sub) pattern, completely decoupling DOM mutations from the Audio Engine, ensuring future UI features (like Jog Wheels) can simply publish state updates.

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
