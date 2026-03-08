export class StateManager {
    #state = {
        decks: {
            1: {
                trackName: null,
                artist: null,
                albumArt: null,
                duration: 0,
                currentTime: 0,
                isPlaying: false,
                isLooping: false,
                volume: 1.0,
                tempoPercentage: 0.0,
                pitch: 1.0,
                nudge: 0.0,
                rmsL: 0,
                rmsR: 0,
                isLoading: false
            },
            2: {
                trackName: null,
                artist: null,
                albumArt: null,
                duration: 0,
                currentTime: 0,
                isPlaying: false,
                isLooping: false,
                volume: 1.0,
                tempoPercentage: 0.0,
                pitch: 1.0,
                nudge: 0.0,
                rmsL: 0,
                rmsR: 0,
                isLoading: false
            }
        },
        master: {
            volume: 1.0,
            crossfader: 0.0 // -1 (Deck 1) to 1 (Deck 2)
        }
    };

    // Store AudioBuffers outside the serializable state
    #audioBuffers = {
        1: null,
        2: null
    };

    #listeners = [];

    // --- Core Methods ---
    
    getState() {
        return JSON.parse(JSON.stringify(this.#state));
    }

    getAudioBuffer(deckId) {
        return this.#audioBuffers[deckId];
    }

    subscribe(listener) {
        this.#listeners.push(listener);
        return () => {
            this.#listeners = this.#listeners.filter(l => l !== listener);
        };
    }

    notify(oldState) {
        const newState = this.getState();
        this.#listeners.forEach(listener => listener(newState, oldState));
    }

    // --- Deck Setters ---

    setDeckLoading(deckId, isLoading) {
        const oldState = this.getState();
        this.#state.decks[deckId].isLoading = isLoading;
        this.notify(oldState);
    }

    setDeckMetadata(deckId, trackName, artist, albumArt) {
        const oldState = this.getState();
        this.#state.decks[deckId].trackName = trackName || null;
        this.#state.decks[deckId].artist = artist || null;
        if(albumArt !== undefined) {
             this.#state.decks[deckId].albumArt = albumArt;
        }
        this.notify(oldState);
    }

    setDeckBuffer(deckId, audioBuffer) {
        const oldState = this.getState();
        this.#audioBuffers[deckId] = audioBuffer;
        this.#state.decks[deckId].duration = audioBuffer ? audioBuffer.duration : 0;
        this.#state.decks[deckId].currentTime = 0;
        this.#state.decks[deckId].isPlaying = false;
        this.notify(oldState);
    }

    setDeckPlaying(deckId, isPlaying) {
        const oldState = this.getState();
        if (this.#audioBuffers[deckId] === null) return; // Cannot play without buffer
        this.#state.decks[deckId].isPlaying = isPlaying;
        this.notify(oldState);
    }

    setDeckLooping(deckId, isLooping) {
        const oldState = this.getState();
        this.#state.decks[deckId].isLooping = isLooping;
        this.notify(oldState);
    }

    setDeckCurrentTime(deckId, time) {
        const oldState = this.getState();
        this.#state.decks[deckId].currentTime = time;
        this.notify(oldState);
    }

    setDeckVolume(deckId, volume) {
        const oldState = this.getState();
        this.#state.decks[deckId].volume = parseFloat(volume);
        this.notify(oldState);
    }

    setDeckTempo(deckId, tempoPercentage) {
        const oldState = this.getState();
        this.#state.decks[deckId].tempoPercentage = parseFloat(tempoPercentage);
        this.#state.decks[deckId].pitch = 1.0 + (parseFloat(tempoPercentage) / 100.0);
        this.notify(oldState);
    }

    setDeckProgress(deckId, progress) {
        const oldState = this.getState();
        this.#state.decks[deckId].progress = progress;
        this.notify(oldState);
    }

    setDeckNudge(deckId, value) {
        const oldState = this.getState();
        this.#state.decks[deckId].nudge = value;
        this.notify(oldState);
    }

    setDeckVU(deckId, rmsL, rmsR) {
        const oldState = this.getState();
        this.#state.decks[deckId].rmsL = rmsL;
        this.#state.decks[deckId].rmsR = rmsR;
        this.notify(oldState);
    }

    // --- Master Mix Setters ---

    setCrossfader(value) {
        const oldState = this.getState();
        this.#state.master.crossfader = parseFloat(value);
        this.notify(oldState);
    }

    setMasterVolume(value) {
        const oldState = this.getState();
        this.#state.master.volume = parseFloat(value);
        this.notify(oldState);
    }

    // --- Session Export/Import ---

    exportSession() {
        return this.getState();
    }

    importSession(sessionData) {
        const oldState = this.getState();
        
        // Safely merge properties from imported session
        if(sessionData.decks) {
            if(sessionData.decks[1]) {
                this.#state.decks[1].volume = sessionData.decks[1].volume ?? 1.0;
                this.#state.decks[1].isLooping = sessionData.decks[1].isLooping ?? false;
                this.#state.decks[1].tempoPercentage = sessionData.decks[1].tempoPercentage ?? 0.0;
            }
            if(sessionData.decks[2]) {
                this.#state.decks[2].volume = sessionData.decks[2].volume ?? 1.0;
                this.#state.decks[2].isLooping = sessionData.decks[2].isLooping ?? false;
                this.#state.decks[2].tempoPercentage = sessionData.decks[2].tempoPercentage ?? 0.0;
            }
        }
        if(sessionData.master) {
            this.#state.master.volume = sessionData.master.volume ?? 1.0;
            this.#state.master.crossfader = sessionData.master.crossfader ?? 0.0;
        }
        
        this.notify(oldState);
    }
}

export const stateManager = new StateManager();
