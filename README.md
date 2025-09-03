# MixKit_WEB
A lightweight, browser‑only DJ toolkit that lives entirely in your local machine. No server, no installation—just open the HTML file and you’re ready to spin.

## 🎧 **DJay.ca MixKit (WEB)** – Stand‑Alone Portable DJ App

**What is it?**  
A lightweight, browser‑only DJ toolkit that lives entirely in your local machine. No server, no installation—just open the HTML file and you’re ready to spin.

---

### Key Features

| Feature | What It Does |
|---------|--------------|
| **Open Local MP3s** | Browse and select any `.mp3` from your computer for instant playback via the Web Audio API. |
| **MP3 Metadata Display** | Shows track title, artist, and album art from the file's ID3 tags. |
| **Deck Controls** | Play, pause, stop, loop (repeat), and crossfade between tracks. |
| **Manual Tempo Control** | Adjust playback speed by +/- 8% for manual beatmatching. |
| **Visual Feedback** | Progress bar, elapsed/total time, and a waveform preview for each deck. |
| **Master Spectrum Analyzer** | Provides a real-time visualization of the master output's frequency spectrum. |
| **Export Settings** | Save your current mix state as a JSON file; reload later to pick up where you left off. |

---

### How It Works

1. **Load the App**  
   - Open `index.html` in any modern browser (Chrome, Edge, Firefox, Safari).

2. **Add Tracks**  
   - Click “Browse” on a deck to select an MP3 file from your hard drive.

3. **Mix & Play**  
   - Use the deck controls for each track. The app keeps a single `AudioContext` and routes audio through gain nodes, enabling smooth volume changes and crossfades.

4. **Save Your Session**  
   - Click “Export” → choose a name → save the JSON file. Load it later with “Import”.

---

### Technical Highlights

- **Pure HTML/CSS/JS** – No frameworks, no build step.
- **Web Audio API** – Full control over audio decoding, mixing, and effects.
- **File API** – Reads local files securely without any server‑side code.
- **jsmediatags Library** – Uses a third-party library loaded from a CDN to read ID3 metadata from MP3 files.
- **Responsive UI** – Works on desktops and tablets.

---

### Quick Start Checklist

| Step | Action |
|------|--------|
| 1 | Double‑click `index.html`. |
| 2 | Click “Browse” on each deck to select an MP3 file. |
| 3 | Hit **Play**. |
| 4 | Adjust volumes, tempo, and use the crossfader to mix! |

---

### Future Enhancements (Roadmap)

- 🎚️ Built‑in effects: reverb, delay, distortion.  
- 🔊 Advanced beat‑matching & tempo sync (automatic BPM detection).  
- 🎹 Key-lock (pitch correction during tempo changes).
- 📱 Mobile‑friendly UI.

Feel free to fork the repo, tweak the CSS, or add your own features—DJay.ca MixKit (WEB) is designed for easy extension.

---

**Happy mixing!** 🎛️
