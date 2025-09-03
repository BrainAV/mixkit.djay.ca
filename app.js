document.addEventListener('DOMContentLoaded', () => {
    // --- Audio Context Setup ---
    // Create a single AudioContext for the entire application
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    // Create a master gain node to control the overall volume
    const masterGain = audioCtx.createGain();
    masterGain.connect(audioCtx.destination);

    // --- Deck Class ---
    // A class to manage the state and functionality of a single deck
    class Deck {
        constructor(deckId) {
            this.deckId = deckId;
            this.audioBuffer = null;
            this.sourceNode = null;
            this.gainNode = audioCtx.createGain();
            this.crossfaderGainNode = audioCtx.createGain();
            this.isPlaying = false;
            this.isLooping = false;
            this.startTime = 0;
            this.pauseOffset = 0;

            // Connect nodes: individual deck gain -> crossfader gain -> master gain
            this.gainNode.connect(this.crossfaderGainNode);
            this.crossfaderGainNode.connect(masterGain);

            // --- UI Elements ---
            this.fileInput = document.getElementById(`file-input-${deckId}`);
            this.playPauseBtn = document.getElementById(`play-pause-btn-${deckId}`);
            this.stopBtn = document.getElementById(`stop-btn-${deckId}`);
            this.loopBtn = document.getElementById(`loop-btn-${deckId}`);
            this.volumeSlider = document.getElementById(`volume-${deckId}`);
            this.trackInfo = document.getElementById(`track-info-${deckId}`);
            this.progressBar = document.getElementById(`progress-${deckId}`);
            this.currentTimeDisplay = document.getElementById(`time-current-${deckId}`);
            this.totalTimeDisplay = document.getElementById(`time-total-${deckId}`);
            this.waveformCanvas = document.getElementById(`waveform-${deckId}`);

            // Initially disable controls
            this.playPauseBtn.disabled = true;
            this.stopBtn.disabled = true;
            this.loopBtn.disabled = true;
            this.volumeSlider.disabled = true;

            // --- Event Listeners ---
            this.fileInput.addEventListener('change', this.loadFile.bind(this));
            this.playPauseBtn.addEventListener('click', this.togglePlayPause.bind(this));
            this.stopBtn.addEventListener('click', this.stop.bind(this));
            this.loopBtn.addEventListener('click', this.toggleLoop.bind(this));
            this.volumeSlider.addEventListener('input', (e) => {
                this.gainNode.gain.value = e.target.value;
            });
        }

        // --- Load Audio File ---
        async loadFile(event) {
            const file = event.target.files[0];
            if (!file) return;

            // Reset previous track state
            this.stop();
            this.trackInfo.textContent = `Loading: ${file.name}...`;
            
            try {
                const arrayBuffer = await file.arrayBuffer();
                this.audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
                
                this.trackInfo.textContent = file.name;
                this.totalTimeDisplay.textContent = this.formatTime(this.audioBuffer.duration);
                this.drawWaveform();
                
                // Enable controls
                this.playPauseBtn.disabled = false;
                this.stopBtn.disabled = false;
                this.loopBtn.disabled = false;
                this.volumeSlider.disabled = false;

            } catch (err) {
                this.trackInfo.textContent = 'Error decoding audio file.';
                console.error(`Error for deck ${this.deckId}:`, err);
            }
        }

        togglePlayPause() {
            // If the audio context is suspended (due to browser autoplay policies), resume it
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }

            if (this.isPlaying) {
                this.pause();
            } else {
                this.play();
            }
        }

        play() {
            if (!this.audioBuffer || this.isPlaying) return;

            this.sourceNode = audioCtx.createBufferSource();
            this.sourceNode.buffer = this.audioBuffer;
            this.sourceNode.loop = this.isLooping;
            this.sourceNode.connect(this.gainNode);

            // Calculate the correct offset to resume from
            const offset = this.pauseOffset % this.audioBuffer.duration;
            this.sourceNode.start(0, offset);

            this.startTime = audioCtx.currentTime - offset;
            this.isPlaying = true;
            this.playPauseBtn.textContent = 'Pause';
            
            // Start the animation frame loop for progress updates
            requestAnimationFrame(this.updateProgress.bind(this));
        }

        pause() {
            if (!this.sourceNode || !this.isPlaying) return;

            this.sourceNode.stop(); // This destroys the source node
            this.sourceNode = null; // Discard the old node
            
            // Save our position
            this.pauseOffset = audioCtx.currentTime - this.startTime;
            this.isPlaying = false;
            this.playPauseBtn.textContent = 'Play';
        }

        stop() {
            if (this.sourceNode) {
                this.sourceNode.stop();
                this.sourceNode = null;
            }
            this.isPlaying = false;
            this.pauseOffset = 0;
            this.startTime = 0;
            this.playPauseBtn.textContent = 'Play';
            this.progressBar.value = 0;
            this.currentTimeDisplay.textContent = '00:00';
        }

        toggleLoop() {
            this.isLooping = !this.isLooping;
            if (this.sourceNode) {
                this.sourceNode.loop = this.isLooping;
            }
            this.loopBtn.textContent = `Loop: ${this.isLooping ? 'On' : 'Off'}`;
            this.loopBtn.style.backgroundColor = this.isLooping ? '#4CAF50' : '#555';
        }

        updateProgress() {
            if (!this.isPlaying) return;

            const elapsed = this.isLooping
                ? (audioCtx.currentTime - this.startTime) % this.audioBuffer.duration
                : audioCtx.currentTime - this.startTime;

            if (elapsed >= this.audioBuffer.duration && !this.isLooping) {
                this.stop();
            } else {
                this.progressBar.value = (elapsed / this.audioBuffer.duration) * 100;
                this.currentTimeDisplay.textContent = this.formatTime(elapsed);
                requestAnimationFrame(this.updateProgress.bind(this));
            }
        }

        formatTime(seconds) {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = Math.floor(seconds % 60);
            return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
        }

        drawWaveform() {
            if (!this.audioBuffer || !this.waveformCanvas) return;

            const canvas = this.waveformCanvas;
            const ctx = canvas.getContext('2d');
            // Get the raw audio data from the first channel
            const channelData = this.audioBuffer.getChannelData(0);
            
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;

            // Clear the canvas before drawing
            ctx.clearRect(0, 0, canvasWidth, canvasHeight);

            // Determine how many samples we need to average for each pixel on the canvas
            const samplesPerPixel = Math.floor(channelData.length / canvasWidth);
            const filteredData = [];

            // Downsample the audio data to fit the canvas width
            for (let i = 0; i < canvasWidth; i++) {
                const blockStart = samplesPerPixel * i;
                let sum = 0;
                for (let j = 0; j < samplesPerPixel; j++) {
                    // Sum the absolute values to get the amplitude
                    sum += Math.abs(channelData[blockStart + j] || 0);
                }
                filteredData.push(sum / samplesPerPixel);
            }

            // Find the maximum value in the filtered data to scale the waveform vertically
            const maxVal = Math.max(...filteredData);
            const scale = canvasHeight / 2 / maxVal;

            // Set the drawing style
            ctx.fillStyle = '#3498db'; // A nice blue color for the waveform
            ctx.beginPath();

            // Draw the waveform as a series of vertical lines from the center
            for (let i = 0; i < filteredData.length; i++) {
                const val = filteredData[i] * scale;
                const y = (canvasHeight - val) / 2;
                ctx.fillRect(i, y, 1, val);
            }
        }
    }

    // --- Instantiate Decks ---
    const deck1 = new Deck(1);
    const deck2 = new Deck(2);

    // --- Master Controls ---
    const masterVolumeSlider = document.getElementById('master-volume');
    masterVolumeSlider.addEventListener('input', (e) => {
        masterGain.gain.value = e.target.value;
    });

    const crossfader = document.getElementById('crossfader');
    const setupCrossfader = () => {
        const value = parseFloat(crossfader.value);
        // Use an equal-power crossfading curve for smooth transition
        const gain1 = Math.cos((value + 1) * 0.25 * Math.PI);
        const gain2 = Math.cos((1 - value) * 0.25 * Math.PI);
        
        deck1.crossfaderGainNode.gain.value = gain1;
        deck2.crossfaderGainNode.gain.value = gain2;
    };
    crossfader.addEventListener('input', setupCrossfader);
    // Initialize crossfader gains
    setupCrossfader();

    // --- Utility Controls (Export/Import) ---
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');

    function exportSession() {
        const sessionState = {
            deck1: {
                trackName: deck1.audioBuffer ? deck1.fileInput.files[0].name : null,
                volume: deck1.volumeSlider.value,
                isLooping: deck1.isLooping,
            },
            deck2: {
                trackName: deck2.audioBuffer ? deck2.fileInput.files[0].name : null,
                volume: deck2.volumeSlider.value,
                isLooping: deck2.isLooping,
            },
            master: {
                volume: masterVolumeSlider.value,
                crossfader: crossfader.value,
            },
        };

        const jsonString = JSON.stringify(sessionState, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'djay_session.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function importSession() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const sessionState = JSON.parse(event.target.result);
                    applySessionState(sessionState);
                } catch (err) {
                    alert('Error: Could not parse session file.');
                    console.error(err);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    function applySessionState(state) {
        // Apply Deck 1 state
        if (state.deck1) {
            deck1.volumeSlider.value = state.deck1.volume;
            deck1.gainNode.gain.value = state.deck1.volume;
            if (deck1.isLooping !== state.deck1.isLooping) {
                deck1.toggleLoop();
            }
            if (state.deck1.trackName && !deck1.audioBuffer) {
                deck1.trackInfo.textContent = `Please load: ${state.deck1.trackName}`;
            }
        }

        // Apply Deck 2 state
        if (state.deck2) {
            deck2.volumeSlider.value = state.deck2.volume;
            deck2.gainNode.gain.value = state.deck2.volume;
            if (deck2.isLooping !== state.deck2.isLooping) {
                deck2.toggleLoop();
            }
            if (state.deck2.trackName && !deck2.audioBuffer) {
                deck2.trackInfo.textContent = `Please load: ${state.deck2.trackName}`;
            }
        }

        // Apply Master state
        if (state.master) {
            masterVolumeSlider.value = state.master.volume;
            masterGain.gain.value = state.master.volume;
            crossfader.value = state.master.crossfader;
            setupCrossfader(); // Apply crossfader gain changes
        }
    }

    exportBtn.addEventListener('click', exportSession);
    importBtn.addEventListener('click', importSession);
});
