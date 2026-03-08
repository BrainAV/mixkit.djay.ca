---
name: state-architect
description: Use this skill to strictly enforce the pub/sub StateManager architecture across multiple audio decks, the master mixer, and visualizations, preventing direct DOM mutation.
---

# Instructions
You are a Senior Software Architect implementing the "Modern Restaurant" Pub/Sub design pattern in the `mixkit.djay.ca` project. Apply this skill whenever modifying UI controls, audio logic, or any file that interacts with the `stateManager` after the architecture refactor. This application is unique because it must juggle the state of **multiple independent decks** and a **master mixer** simultaneously.

## 1. The Prime Directive
**NO DIRECT DOM MUTATION FROM USER ACTIONS.**
If a user clicks a button, moves a crossfader, or adjusts their EQ, the event listener **must not** directly update the HTML or CSS.

*   **WRONG:** `deck1Volume.addEventListener('input', (e) => { deck1Gain.gain.value = e.target.value; });`
*   **RIGHT:** `deck1Volume.addEventListener('input', (e) => { stateManager.setDeckVolume(1, e.target.value); });`

The `stateManager` is the single source of truth. It holds the state privately for each `deck` and the `master` channel.
1.  **Always use Setters**: To change the state, you must call a specific setter method on the `stateManager` instance exported from `state.js` (e.g., `setDeckPlaying(1, true)`, `setCrossfader(0.5)`).
2.  **Ephemeral Input (Exceptions)**: High-frequency audio feedback like "Stutter Play" during scrubbing may be triggered directly from `UI` to `Audio` if it has no persistent state, but all changes to position/volume **must** go through the State.
3.  **Composite Pitch (Nudge)**: When implementing pitch bends (nudging), store the `nudge` value as a separate delta in the state. The `AudioEngine` should calculate the final playback rate.
4.  **Encapsulation**: Do not attempt to bypass setters by mutating the state object directly.

## 3. Subscribing to State (Reactivity & Audio Sync)
UI elements and the Audio Engine must "wear the headset" to listen for changes. Because of multiple decks, you need to be precise.
1.  **The Subscribe Method:** Use `stateManager.subscribe((newState, oldState) => { ... })` in your initialization logic (`app.js`, `audio-engine.js`, `ui.js`).
2.  **Diff Checking:** Inside the subscription callback, compare `newState` against `oldState` to determine what actually changed before executing DOM manipulation or Web Audio API updates.
    ```javascript
    stateManager.subscribe((newState, oldState) => {
        // Did Deck 1's playback state change?
        if (newState.decks[1].isPlaying !== oldState.decks[1].isPlaying) {
            updateDeckPlayPauseUI(1, newState.decks[1].isPlaying);
            if (newState.decks[1].isPlaying) { audioEngine.playDeck(1); } else { audioEngine.pauseDeck(1); }
        }
        
        // Did the crossfader move?
        if (newState.master.crossfader !== oldState.master.crossfader) {
            updateCrossfaderUI(newState.master.crossfader);
            audioEngine.updateCrossfaderNode(newState.master.crossfader);
        }
    });
    ```

## 4. Hardware and Event Expansion
Since the UI is fully decoupled, adding MIDI or Keyboard support is trivial. For any new arbitrary input device:
1. Capture the input event.
2. Route it directly to a `stateManager` setter.
3. Trust that the `subscribe()` loop will handle both the Web Audio API updates and UI sync seamlessly.
