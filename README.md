# MixKit_WEB
A lightweight, browser‑only DJ toolkit that lives entirely in your local machine. No server, no installation—just open the HTML file and you’re ready to spin.

## 🎧 **DJay.ca MixKit (WEB)** – Stand‑Alone Portable DJ App

**What is it?**  
A lightweight, browser‑only DJ toolkit that lives entirely in your local machine. No server, no installation—just open the HTML file and you’re ready to spin.

---

### Key Features

| Feature | What It Does |
|---------|--------------|
| **Load Local Audio** | Browse and select common audio files (`.mp3`, `.wav`, `.flac`, etc.) from your computer for instant playback. |
| **MP3 Metadata Display** | Shows track title, artist, and album art from the file's ID3 tags. |
| **Deck Controls** | Play, pause, stop, loop (repeat), and crossfade between tracks. |
| **Manual Tempo Control** | Adjust playback speed by +/- 8% for manual beatmatching. |
| **Visual Feedback** | Progress bar, elapsed/total time, and a waveform preview for each deck. |
| **Master Spectrum Analyzer** | Provides a real-time visualization of the master output's frequency spectrum. |
| **Export Settings** | Save your current mix state as a JSON file; reload later to pick up where you left off. |

---

### Architecture

The application is built using a modular ES6 architecture, leveraging a centralized State Management pattern to decouple the UI from the Audio Engine.

-   **`js/state.js`**: The single source of truth. Manages all application state (decks, mixer, metadata) and handles persistence/session logic.
-   **`js/audio-engine.js`**: Manages the Web Audio API graph. Subscribes to the state to update audio nodes (gain, playback rate, filters) in real-time.
-   **`js/ui.js`**: Handles all DOM interactions, canvas rendering (waveforms, VU meters), and event listeners. Publishes user actions to the State Manager.
-   **`js/main.js`**: Coordinates the initialization and bootstrapping of the modules.

---

### How It Works

1.  **Initialize**
    -   Opening `index.html` bootstraps the modules. The `AudioEngine` initializes the `AudioContext` only after the first user interaction.

2.  **Add Tracks**
    -   Choose files via "Browse" or drag-and-drop into a deck. The `UIEngine` reads metadata via `jsmediatags` and triggers the `AudioEngine` to decode the buffer.

3.  **Mix & Play**
    -   Actions like Play, Loop, and Volume changes are sent to the `StateManager`. All components subscribe to these changes, ensuring the UI and Audio remain perfectly synced.

4.  **Save Your Session**
    -   "Export" captures the current `StateManager` state into a JSON file for later "Import".

---

### Technical Highlights

-   **Modular vanilla JS** – No frameworks or build steps; uses native ES6 modules.
-   **Advanced State Management** – Uses a reactive Pub/Sub architecture for robust, scalable feature development.
-   **Web Audio API** – High-performance audio processing and analysis.
-   **Responsive Design** – Premium glassmorphism aesthetic tailored for desktop and mobile.

---

### Quick Start Checklist

| Step | Action |
|------|--------|
| 1 | Double‑click `index.html`. |
| 2 | Click “Browse” on each deck to select an audio file. |
| 3 | Hit **Play**. |
| 4 | Adjust volumes, tempo, and use the crossfader to mix! |

---

### Future Enhancements (Roadmap)

- ⚙️ Settings button with overlay window for options.
- 🎶 Playlist with autoplay.
- 🎚️ Built‑in effects: reverb, delay, distortion.  
- 🔊 Advanced beat‑matching & tempo sync (automatic BPM detection).  
- 🎹 Key-lock (pitch correction during tempo changes).
- 📱 Mobile‑friendly UI.

Feel free to fork the repo, tweak the CSS, or add your own features—DJay.ca MixKit (WEB) is designed for easy extension.

---

**Happy mixing!** 🎛️
