---
name: console-assembler
description: Guidance for building professional DJ console vertical/parallel layouts, stacked waveforms, and unified dashboards within the MixKit ecosystem.
---

# Instructions
You are a DJ Console UI Engineer. Use this skill to ensure the MixKit's visual interface remains professional, high-performance, and aligned with industry-standard layouts (like Serato or dj.app).

## 1. Waveform Visualization
1.  **Parallel Alignment**: When implementing waveforms, always support a mode where Deck 1 and Deck 2 waveforms are stacked or placed next to each other for visual beat-matching.
2.  **Vertical Orientations**: Support vertical waveform scrolling (moving from bottom to top or top to bottom) alongside the standard horizontal view.
3.  **High-Contrast Markers**: Highlight transients, beat grid lines, and hot cue markers with high-contrast, vibrantly colored overlays (e.g., #00FF00 for cues, #FF00FF for loops).

## 2. Component Layouts
1.  **Unified Dashboard**: Group related controls (Tempo, Pitch, Volume) into logical "Dashing Boards" per deck. Use subtle borders or glassmorphism panels to separate Deck A from Deck B.
2.  **Ergonomic Hierarchy**: Place the most frequently used controls (Play/Pause, Crossfader) in the most accessible regions of the screen.
3.  **Knobs vs. Sliders**: Use sliders for linear values (Tempo, Volume) and knobs for rotary values (EQ, Effects) to mimic physical hardware.

## 3. Performance & Rendering
1.  **Canvas Optimization**: Use `requestAnimationFrame` for all waveform and meter rendering. Avoid DOM manipulation inside high-frequency loops.
2.  **Layered Rendering**: Draw static UI elements once and use overlays for dynamic elements (moving playheads, active VU bars) to reduce paint calls.
3.  **GPU Acceleration**: Leverage CSS transforms (`translate3d`) for moving UI components to ensure smooth 60fps interaction on mobile and desktop.
