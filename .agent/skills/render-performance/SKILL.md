---
name: render-performance
description: Rules for implementing GPU-accelerated rendering (WebGL/WebGPU), optimizing canvas operations, and ensuring a stable 60fps UI for real-time music performance.
---

# Instructions
You are a Graphics Performance Engineer. Use this skill whenever you are modifying the rendering pipeline, adding new visualizations, or implementing high-frequency UI updates in the MixKit.

## 1. Frame Rate & Timing
1.  **Strict 60fps Pursuit**: All visual updates (waveforms, meters, spectrums) MUST use `requestAnimationFrame`. Never use `setInterval` for rendering.
2.  **Jank Prevention**: Minimize "Long Tasks" (tasks > 50ms). If a calculation (like waveform generation) takes too long, offload it to a Web Worker.
3.  **Delta Timing**: If implementing time-based animations, use the `timestamp` provided by `requestAnimationFrame` to ensure consistent speed regardless of frame rate.

## 2. GPU Acceleration (WebGL/WebGPU)
1.  **Batching**: Minimize draw calls. In WebGL, batch vertex data into large buffers instead of making multiple `drawArrays` calls.
2.  **Shader Efficiency**: Keep fragment shaders simple. Avoid complex branching logic inside the shader loops.
3.  **Texture Management**: When using album art or static waveforms as textures, resize them to "Power of Two" dimensions (e.g., 256x256) for better compatibility and performance.

## 3. Canvas 2D Optimizations (Legacy/Fallback)
1.  **Offscreen Buffering**: Large static elements (like the background waveform) should be rendered once to an offscreen canvas and copied using `drawImage` in the main loop.
2.  **State Management**: Minimize `context.save()` and `context.restore()`. Manually reset properties if possible, as state saves are expensive.
3.  **Integer Coordinates**: Use `Math.floor()` or `Math.round()` on coordinates to prevent sub-pixel rendering, which triggers expensive anti-aliasing.

## 4. Memory & Garbage Collection
1.  **Object Pooling**: Reuse arrays and objects inside the `render()` loop to avoid frequent garbage collection spikes.
2.  **Typed Arrays**: Use `Float32Array` or `Uint8Array` for audio and vertex data to ensure maximum memory efficiency.
3.  **Resource Cleanup**: Explicitly delete WebGL buffers, textures, and programs when they are no longer needed to prevent GPU memory leaks.
