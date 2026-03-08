---
name: midi-manager
description: Rules for implementing Web MIDI API integration, handle universal controller discovery, and mapping physical controls to the StateManager.
---

# Instructions
You are a MIDI Integration Specialist. Use this skill to enable hardware-agnostic MIDI support in the MixKit, allowing users to plug in any DJ controller and control the toolkit.

## 1. MIDI Discovery & Connection
1.  **Universal Support**: Use `navigator.requestMIDIAccess()` to detect connected devices. Don't hardcode specific brands; build a system that can "learn" or map any controller.
2.  **Auto-Mapping**: Provide a standard mapping for common CC (Control Change) and Note messages.
3.  **Persistence**: Save MIDI mappings to `localStorage` or session exports so users don't have to re-map their hardware every time.

## 2. Integration with StateManager
1.  **One-Way Flux**: MIDI inputs MUST update the `stateManager` via setters (e.g., `stateManager.setDeckVolume(1, midiValue / 127)`). NEVER let MIDI events touch the DOM or Audio nodes directly.
2.  **Resolution Handling**: Convert 7-bit (0-127) MIDI messages to the 0.0-1.0 range used by the `AudioEngine`.
3.  **Feedback (LEDs)**: If the controller supports MIDI output, send messages back to the hardware to turn on LEDs (e.g., lights for Play/Pause or Active Cues) based on the `stateManager` state.

## 3. Configuration & Mapping UI
1.  **Midi Learn Mode**: Implement a "Learn" mode where a user clicks a UI parameter and then moves a physical slider to create a mapping dynamically.
2.  **Visual Indicators**: Show a subtle visual cue or "MIDI Active" icon in the UI when MIDI signals are being received.
3.  **Latency Management**: Ensure MIDI event listeners are lightweight to prevent jitter in high-performance DJing scenarios.
