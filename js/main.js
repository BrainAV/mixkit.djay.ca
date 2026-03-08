/**
 * DJay.ca MixKit (WEB)
 * Main Bootstrap
 */

import { stateManager } from './state.js';
import { audioEngine } from './audio-engine.js';
import { uiEngine } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
    // Force a re-render of the initial state to sync UI to defaults
    stateManager.notify(null);
    console.log('[MixKit Core] Bootstrapped with Pub/Sub State Architecture');
});
