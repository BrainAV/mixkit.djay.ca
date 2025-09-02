# MixKit_WEB
A lightweight, browser‑only DJ toolkit that lives entirely in your local machine. No server, no installation—just open the HTML file and you’re ready to spin.

## 🎧 **DJay.ca MixKit (WEB)** – Stand‑Alone Portable DJ App

**What is it?**  
A lightweight, browser‑only DJ toolkit that lives entirely in your local machine. No server, no installation—just open the HTML file and you’re ready to spin.

---

### Key Features

| Feature | What It Does |
|---------|--------------|
| **Open Local MP3s** | Drag‑and‑drop or browse any `.mp3` from your computer; instant playback via the Web Audio API. |
| **Basic Deck Controls** | Play, pause, stop, loop (repeat), and crossfade between tracks. |
| **Volume & Mix Controls** | Per‑track volume sliders, master fader, and a simple “beat‑match” sync button. |
| **Visual Feedback** | Progress bar, elapsed/total time, waveform preview (optional). |
| **Export Settings** | Save your current mix state as a JSON file; reload later to pick up where you left off. |
| **Portable & Offline** | All assets bundled in a single ZIP – no external servers or CDN required. |

---

### How It Works

1. **Load the App**  
   - Unzip `DJay.ca MixKit (WEB).zip` and open `index.html` in any modern browser (Chrome, Edge, Firefox, Safari).

2. **Add Tracks**  
   - Drag an MP3 file onto the page or click “Browse” to select from your hard drive.

3. **Mix & Play**  
   - Use the deck controls for each track. The app keeps a single `AudioContext` and routes audio through gain nodes, enabling smooth volume changes and crossfades.

4. **Save Your Session**  
   - Click “Export” → choose a name → save the JSON file. Load it later with “Import”.

---

### Technical Highlights

- **Pure HTML/CSS/JS** – No frameworks, no build step.
- **Web Audio API** – Full control over audio decoding, mixing, and effects.
- **File API** – Reads local files securely without any server‑side code.
- **Responsive UI** – Works on desktops and tablets (but not yet mobile‑optimized).

---

### Quick Start Checklist

| Step | Action |
|------|--------|
| 1 | Unzip the ZIP archive. |
| 2 | Double‑click `index.html`. |
| 3 | Drag an MP3 file into the drop zone or click “Browse”. |
| 4 | Hit **Play**. |
| 5 | Adjust volumes, use crossfade, and enjoy! |

---

### Future Enhancements (Roadmap)

- 🎚️ Built‑in effects: reverb, delay, distortion.  
- 🔊 Advanced beat‑matching & tempo sync.  
- 📱 Mobile‑friendly UI.  
- 🖼️ Real‑time spectrum analyzer canvas.

Feel free to fork the repo, tweak the CSS, or add your own features—DJay.ca MixKit (WEB) is designed for easy extension.

---

**Happy mixing!** 🎛️
