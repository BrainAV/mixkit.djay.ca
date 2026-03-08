# Roadmap

This document outlines the future enhancements and planned features for the DJay.ca MixKit (WEB). It serves as a guide for ongoing development and helps track our progress toward making the toolkit more robust, feature-rich, and user-friendly.

## 🚀 Upcoming Features & Enhancements

### 1. Advanced Audio & Mixing Capabilities
- [ ] **3-Band EQ per Channel:** Add dedicated High, Mid, and Low equalizer knobs with Web Audio API filters.
- [ ] **Advanced Beat-Matching & Tempo Sync:** Implement automatic BPM detection to allow seamless beat-matching between tracks, along with a 'SYNC' button feature.
- [ ] **Key-Lock / Pitch Correction:** Maintain the original musical key of a track when adjusting the playback tempo up or down (Master Tempo).
- [ ] **Built-in Effects Processing:** Add Web Audio API nodes for effects such as Reverb, Delay, and Filter accessible directly from the deck controls, including visual knob feedback.
- [ ] **Configurable Audio Settings:** Allow users to define audio latency and custom tempo ranges (e.g., +/- 8%, 16%, 50%).
- [ ] **Recording:** Implement a feature to record the master output of the mix and save it directly as an audio file (`.wav` or `.mp3`) via the MediaRecorder API.

### 2. User Interface & Experience
- [ ] **Jog Wheels:** Introduce interactive jog wheels for track scrubbing/scratching, featuring center-aligned album art inspired by professional controllers.
- [ ] **Hot Cues:** Add assignable Hot Cue buttons (1-8) for jumping to specific markers within a track.
- [ ] **Professional Visual Feedback:** Upgrade the VU meters to stereo LED-style readouts and refine the waveform overlays (playheads, cue markers).
- [ ] **Settings Modal / Overlay:** Create a dedicated settings modal with an overlay window to centralize application options (e.g., crossfader curves, default visualizations, theme toggles).
- [ ] **Persistent Settings (localStorage):** Remember the user's settings, custom crossfader curves, and visual preferences across browser sessions.
- [ ] **Mobile-Friendly UI Overhaul:** Improve the layout for tablets and mobile devices with larger touch targets and a responsive, potentially stackable two-deck view.
- [ ] **Dark Mode / Console Theming:** Extract the dark "Panel Surface" and "Component Background" aesthetics from our console prototypes to provide a "Pro Dark" theme alongside our glassmorphism aesthetics.

### 3. Track Management & Workflow
- [ ] **Playlist & Autoplay:** Introduce a playlist queue manager that supports drag-and-drop reordering, folder imports, and a dedicated 'Automix' button for hands-free transitions.
- [ ] **Advanced File & Folder Handling:** Support importing entire folders of songs into the playlist natively within the browser, along with improved ID3 tag parsing.
- [ ] **Export/Import Improvements:** Allow batch saving of tracks in a session format, supporting playlist orders alongside mixer states.
- [ ] **MIDI Controller Support:** Integrate the Web MIDI API to allow users to control the application with physical DJ controllers (which is now trivial thanks to the robust pub/sub state manager).

## 🏗️ Major Architectural Overhaul
- [ ] **Advanced State Management (Pub/Sub Pattern):** Refactor the tightly coupled `app.js` into modular components (`state.js`, `audio-engine.js`, `ui.js`). Implement a centralized store to independently manage the state of multiple decks, the master mixer, and visualizations. This will decouple the DOM from the Audio Engine.

## 🛠 Active Technical Improvements
- [ ] Refactor Web Audio API context usage to ensure peak efficiency across multiple decks and a single analyzer.
- [ ] Adopt stricter ESLint and Prettier rules for the codebase.

---

*Note: This roadmap is subject to change based on community feedback, browser feature support, and development priorities. Feel free to contribute or raise issues in the repository regarding features you'd like to see prioritized.*
