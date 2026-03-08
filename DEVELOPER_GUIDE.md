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

The `UIEngine` (in `js/ui.js`) handles all DOM elements and Canvas rendering.

-   **Waveforms**: Drawn once when a track is loaded.
-   **VU Meters**: Calculated in the `AudioEngine` and set in the state. The UI simply renders the current RMS values.
-   **Spectrum**: High-frequency loop drawing the master output.

---

## 🚀 Adding New Features

### Example: Adding a 3-Band EQ
1.  **State**: Add `eq` properties to the deck objects in `js/state.js` with corresponding setters.
2.  **Audio**: In `js/audio-engine.js`, create `BiquadFilterNode`s and insert them into the deck's node chain. Update their gain/frequency in the subscription loop.
3.  **UI**: In `index.html`, add the knobs. In `js/ui.js`, add event listeners that call the new `stateManager` setters.
