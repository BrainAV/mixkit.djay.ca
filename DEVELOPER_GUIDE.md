# MixKit Developer Guide

Welcome to the technical guide for the DJay.ca MixKit. This document is intended for developers and AI agents looking to extend or maintain the application.

## 🧠 Core Architecture: Advanced State Management

The MixKit uses a **Pub/Sub (Publisher/Subscriber)** architecture. This pattern ensures that the **Audio Engine** and **UI Layer** are completely decoupled.

### The Single Source of Truth
The `StateManager` (in `js/state.js`) holds the private `#state` of the entire app:
- Deck 1 & 2 (Playing status, Volume, Tempo, Track Metadata, etc.)
- Master Mixer (Crossfader, Master Volume)

### How to Modify State (Publishers)
Never mutate the state directly. You must use the provided setters:
```javascript
import { stateManager } from './state.js';

// To change volume
stateManager.setDeckVolume(1, 0.8);

// To play a deck
stateManager.setDeckPlaying(2, true);
```

### How to React to Changes (Subscribers)
Both the UI and Audio Engine subscribe to the `StateManager`. When a setter is called, all subscribers are notified with the `newState` and the `oldState`.

```javascript
stateManager.subscribe((newState, oldState) => {
    // Check if the specific value changed before performing expensive updates
    if (newState.decks[1].isPlaying !== oldState.decks[1].isPlaying) {
        // Correctly react here (e.g., start/stop audio, update button text)
    }
});
```

---

## 🎧 Audio Engine Routing

The `AudioEngine` (in `js/audio-engine.js`) manages the Web Audio API graph.

1.  **Deck Buffer Sources**: Created on-demand when playing.
2.  **Gain Nodes**: Independent gain for each deck.
3.  **Crossfader Nodes**: Secondary gain nodes controlled by the crossfader's cosine-curve logic.
4.  **Splitter/Analyser Nodes**: Each deck has stereo analysers for per-channel VU meters.
5.  **Master Analyser**: Final spectrum analysis before reaching the `destination`.

---

## 🖌️ UI Engine & Rendering

The `UIEngine` (in `js/ui.js`) handles all DOM elements and GPU-accelerated rendering.

-   **WebGL Waveforms**: Rendered using vertex batches once loaded. Features a "Professional Imaging" animation.
-   **WebGL VU Meters**: 60fps RMS metering using geometric batching (L/R channels per deck).
-   **WebGL Spectrum**: High-frequency FFT analysis using a shared vertex buffer for bars and peaks.
-   **Playheads**: High-contrast, hardware-style vertical markers drawn atop the waveforms.

---

## 🏎️ Performance Optimization (v0.2.0)

To maintain a professional 60fps without "jank," we've implemented several advanced patterns:

### 1. Geometric Batching
Instead of making one `gl.drawArrays` call per bar (which would be thousands per frame), we consolidate all bars into a single large `Float32Array` (Vertex Buffer). This brings the overhead of a full dashboard refresh down to just a handful of draw calls.

### 2. Zero-Allocation Hot loop
All typed arrays (Vertex Buffers, FFT data) are pre-allocated in the constructor and reused. We never create new objects inside the `requestAnimationFrame` loop, which eliminates Garbage Collection (GC) pauses.

### 3. Dynamic Resolution Sync
The `UIEngine` automatically calculates the `clientWidth/Height` of each canvas and adjusts the internal WebGL resolution accordingly, ensuring pixel-perfect visuals on High-DPI (Retina) displays.

---

---

## 🎹 Professional Audio Features

### Momentary Pitch Bend (Nudge)
- **State**: Tracked via `nudge` property in each deck.
- **Audio**: The `AudioEngine` subscription loop calculates the `playbackRate` as `basePitch + nudge`. Default value is `0`.
- **UI**: Mouse events (`mousedown`/`mouseup`) on the nudge buttons toggle the value between `0` and `+/- 0.05`.

### Stutter-Cueing (Audio Feedback)
- **Logic**: Implemented via `audioEngine.playStutter()`.
- **Behavior**: Unlike the main playback loop, this is a "fire-and-forget" 50ms burst triggered directly from the `UIEngine` during scrubbing or CUE-point selection. It does not update the `isPlaying` state.

---

## 🚀 Adding New Features

### Example: Adding a 3-Band EQ
1.  **State**: Add `eq` properties to the deck objects in `js/state.js` with corresponding setters.
2.  **Audio**: In `js/audio-engine.js`, create `BiquadFilterNode`s and insert them into the deck's node chain. Update their gain/frequency in the subscription loop.
3.  **UI**: In `index.html`, add the knobs. In `js/ui.js`, add event listeners that call the new `stateManager` setters.

