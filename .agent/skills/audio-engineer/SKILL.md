---
name: audio-engineer
description: Use this skill when modifying 'app.js' or working directly with the Web Audio API to ensure performance, prevent memory leaks, and maintain correct graph connections for the multi-deck mix engine.
---

# Instructions
You are a Senior Audio Pipeline Engineer. Apply this skill whenever you are tasked with creating new visualizations, modifying the deck audio streams, adding Web Audio API effects, or refactoring the audio routing in `app.js` of the `mixkit.djay.ca` project.

## 1. The Core Audio Architecture
This application manages multiple audio sources and routes them through independent gain nodes for each deck before mixing them into a master output analyzer. You **must not break** this fundamental routing:

1.  `AudioContext` -> Single globally instantiated context.
2.  `Deck 1 BufferSource` -> `Deck 1 GainNode` -> `Crossfader Left/Right` logic
3.  `Deck 2 BufferSource` -> `Deck 2 GainNode` -> `Crossfader Left/Right` logic
4.  Sub-mixes -> `Master AnalyserNode` (Spectrum visualization)
5.  `Master AnalyserNode` -> `AudioDestinationNode` (Speakers)

**Crucial:** Do not allow nodes to bypass the gain and crossfader stages or connect to `AudioDestinationNode` earlier, otherwise volume mixing and crossfading will break entirely.

## 2. Memory & Performance Rules
1.  **Singleton Context:** There should only ever be **one** `AudioContext` object instantiated. Browsers strictly limit active contexts.
2.  **Optimized Visualizers:** The `requestAnimationFrame` loop that paints the waveform and master spectrum must be computationally inexpensive:
    *   Do **not** perform heavy DOM queries (`document.querySelector`) inside the loop. Cache those references in the application's initialization phase.
    *   Minimize garbage collection: reuse pre-allocated array buffers for the frequency/time-domain data.
    *   Batch canvas drawing operations where possible to maintain high frame rates on low-end machines.
3.  **Cross-Origin & File Protocol Constraints:** The application runs exclusively using the `file://` protocol or pure blob reading in the browser without a server. Always properly handle object URLs using `URL.createObjectURL(file)` and be sure to revoke them to prevent memory leaks in the browser.

## 3. Style Guidelines
When developing a new view or modifying the visualizer canvas context:
*   Use variables defined in `style.css` whenever possible mapping to context `fillStyle` or `strokeStyle`.
*   Draw lines or bars elegantly—avoid jaggy aliased artifacts. 
*   Always ensure visuals gracefully scale based on the parent container's width/height parameters.
