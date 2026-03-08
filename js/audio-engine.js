import { stateManager } from './state.js';

class AudioEngine {
    constructor() {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.audioCtx.createGain();
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 256;
        
        this.masterGain.connect(this.analyser);
        this.analyser.connect(this.audioCtx.destination);

        this.decks = {
            1: this.createDeckNodes(1),
            2: this.createDeckNodes(2)
        };
        
        // Subscription for Reactive Audio updates
        stateManager.subscribe(this.handleStateChange.bind(this));
    }

    createDeckNodes(deckId) {
        const gainNode = this.audioCtx.createGain();
        const crossfaderGainNode = this.audioCtx.createGain();
        const splitterNode = this.audioCtx.createChannelSplitter(2);
        const analyserNodeL = this.audioCtx.createAnalyser();
        const analyserNodeR = this.audioCtx.createAnalyser();
        
        analyserNodeL.fftSize = 2048;
        analyserNodeR.fftSize = 2048;

        gainNode.connect(crossfaderGainNode);
        gainNode.connect(splitterNode);
        splitterNode.connect(analyserNodeL, 0);
        splitterNode.connect(analyserNodeR, 1);
        crossfaderGainNode.connect(this.masterGain);

        return {
            sourceNode: null,
            gainNode,
            crossfaderGainNode,
            analyserNodeL,
            analyserNodeR,
            startTime: 0,
            pauseOffset: 0
        };
    }

    async decodeAudio(arrayBuffer) {
        return await this.audioCtx.decodeAudioData(arrayBuffer);
    }

    resumeContext() {
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    }

    handleStateChange(newState, oldState) {
        // Did Deck 1 Volume Change?
        if (newState.decks[1].volume !== oldState?.decks[1].volume) {
            this.decks[1].gainNode.gain.value = newState.decks[1].volume;
        }

        // Did Deck 2 Volume Change?
        if (newState.decks[2].volume !== oldState?.decks[2].volume) {
            this.decks[2].gainNode.gain.value = newState.decks[2].volume;
        }

        // Play/Pause State Deck 1
        if (newState.decks[1].isPlaying !== oldState?.decks[1].isPlaying) {
            if (newState.decks[1].isPlaying) this.playDeck(1, newState.decks[1]);
            else this.pauseDeck(1, newState.decks[1]);
        }

        // Play/Pause State Deck 2
        if (newState.decks[2].isPlaying !== oldState?.decks[2].isPlaying) {
            if (newState.decks[2].isPlaying) this.playDeck(2, newState.decks[2]);
            else this.pauseDeck(2, newState.decks[2]);
        }

        // Looping State Deck 1
        if (newState.decks[1].isLooping !== oldState?.decks[1].isLooping) {
            if (this.decks[1].sourceNode) {
                this.decks[1].sourceNode.loop = newState.decks[1].isLooping;
            }
        }

        // Looping State Deck 2
        if (newState.decks[2].isLooping !== oldState?.decks[2].isLooping) {
            if (this.decks[2].sourceNode) {
                this.decks[2].sourceNode.loop = newState.decks[2].isLooping;
            }
        }

        // Pitch / Tempo Deck 1
        if (newState.decks[1].pitch !== oldState?.decks[1].pitch) {
            if (this.decks[1].sourceNode) {
                this.decks[1].sourceNode.playbackRate.value = newState.decks[1].pitch;
            }
        }

        // Pitch / Tempo Deck 2
        if (newState.decks[2].pitch !== oldState?.decks[2].pitch) {
            if (this.decks[2].sourceNode) {
                this.decks[2].sourceNode.playbackRate.value = newState.decks[2].pitch;
            }
        }

        // Seeking (Current Time jump)
        [1, 2].forEach(deckId => {
            const newTime = newState.decks[deckId].currentTime;
            const oldTime = oldState ? oldState.decks[deckId].currentTime : 0;
            const diff = Math.abs(newTime - oldTime);
            
            // If the jump is larger than a normal tick (meaning a scrub happened)
            // and the deck is paused, we just update pauseOffset. If playing, stop and restart.
            if(diff > 0.5) { 
                this.decks[deckId].pauseOffset = newTime;
                if(newState.decks[deckId].isPlaying && this.decks[deckId].sourceNode) {
                    this.decks[deckId].sourceNode.stop();
                    this.playDeck(deckId, newState.decks[deckId]);
                }
            }
        });

        // Crossfader
        if (!oldState || newState.master.crossfader !== oldState.master.crossfader) {
            const value = newState.master.crossfader;
            const gain1 = Math.cos((value + 1) * 0.25 * Math.PI);
            const gain2 = Math.cos((1 - value) * 0.25 * Math.PI);
            this.decks[1].crossfaderGainNode.gain.value = gain1;
            this.decks[2].crossfaderGainNode.gain.value = gain2;
        }

        // Master Volume
        if (!oldState || newState.master.volume !== oldState.master.volume) {
            this.masterGain.gain.value = newState.master.volume;
        }

        // Nudge (Temporary Pitch Shift)
        [1, 2].forEach(deckId => {
            const nudge = newState.decks[deckId].nudge || 0;
            const oldNudge = oldState ? (oldState.decks[deckId].nudge || 0) : 0;
            if (nudge !== oldNudge && this.decks[deckId].sourceNode) {
                const basePitch = newState.decks[deckId].pitch;
                this.decks[deckId].sourceNode.playbackRate.value = basePitch + nudge;
            }
        });
    }

    playStutter(deckId, offset, duration = 0.05) {
        this.resumeContext();
        const buffer = stateManager.getAudioBuffer(deckId);
        if (!buffer) return;

        const stutterSource = this.audioCtx.createBufferSource();
        stutterSource.buffer = buffer;
        stutterSource.connect(this.decks[deckId].gainNode);
        
        const pitch = stateManager.getState().decks[deckId].pitch;
        stutterSource.playbackRate.value = pitch;
        
        stutterSource.start(0, offset % buffer.duration, duration);
    }

    playDeck(deckId, deckState) {
        this.resumeContext();
        const buffer = stateManager.getAudioBuffer(deckId);
        if (!buffer) return;

        const deck = this.decks[deckId];
        deck.sourceNode = this.audioCtx.createBufferSource();
        deck.sourceNode.buffer = buffer;
        deck.sourceNode.loop = deckState.isLooping;
        deck.sourceNode.playbackRate.value = deckState.pitch;
        deck.sourceNode.connect(deck.gainNode);

        const offset = deck.pauseOffset % buffer.duration;
        deck.sourceNode.start(0, offset);
        deck.startTime = this.audioCtx.currentTime - offset;

        const loop = () => {
            if (!stateManager.getState().decks[deckId].isPlaying) {
                stateManager.setDeckVU(deckId, 0, 0);
                return;
            }

            const elapsed = deckState.isLooping
                ? (this.audioCtx.currentTime - deck.startTime) % buffer.duration
                : this.audioCtx.currentTime - deck.startTime;

            if (elapsed >= buffer.duration && !deckState.isLooping) {
                // Track ended naturally
                deck.sourceNode = null;
                deck.pauseOffset = 0;
                deck.startTime = 0;
                stateManager.setDeckPlaying(deckId, false);
                stateManager.setDeckCurrentTime(deckId, 0);
                return;
            }

            // Sync visual time periodically to UI state (avoid blasting state too often)
            stateManager.setDeckCurrentTime(deckId, elapsed);

            // Calculate VU meters
            const bufferLengthL = deck.analyserNodeL.frequencyBinCount;
            const dataArrayL = new Float32Array(bufferLengthL);
            deck.analyserNodeL.getFloatTimeDomainData(dataArrayL);

            const bufferLengthR = deck.analyserNodeR.frequencyBinCount;
            const dataArrayR = new Float32Array(bufferLengthR);
            deck.analyserNodeR.getFloatTimeDomainData(dataArrayR);

            let sumL = 0; for(let i = 0; i < dataArrayL.length; i++) sumL += dataArrayL[i] * dataArrayL[i];
            let sumR = 0; for(let i = 0; i < dataArrayR.length; i++) sumR += dataArrayR[i] * dataArrayR[i];
            
            const rmsL = Math.sqrt(sumL / dataArrayL.length);
            const rmsR = Math.sqrt(sumR / dataArrayR.length);
            
            stateManager.setDeckVU(deckId, rmsL, rmsR);

            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    pauseDeck(deckId, deckState) {
        const deck = this.decks[deckId];
        if (!deck.sourceNode) return;
        deck.sourceNode.stop();
        deck.sourceNode = null;
        deck.pauseOffset = this.audioCtx.currentTime - deck.startTime;
        stateManager.setDeckCurrentTime(deckId, deck.pauseOffset);
    }
}

export const audioEngine = new AudioEngine();
