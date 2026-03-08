import { stateManager } from './state.js';
import { audioEngine } from './audio-engine.js';

class UIEngine {
    constructor() {
        this.decks = {
            1: this.getDeckElements(1),
            2: this.getDeckElements(2)
        };

        this.master = {
            volume: document.getElementById('master-volume'),
            crossfader: document.getElementById('crossfader'),
            exportBtn: document.getElementById('export-btn'),
            importBtn: document.getElementById('import-btn'),
            spectrumCanvas: document.getElementById('master-spectrum')
        };

        this.seekTooltip = document.getElementById('seek-tooltip');

        this.setupEventListeners();
        stateManager.subscribe(this.render.bind(this));

        // Start drawing spectrum
        this.drawSpectrum();
    }

    getDeckElements(deckId) {
        return {
            container: document.getElementById(`deck${deckId}`),
            fileInput: document.getElementById(`file-input-${deckId}`),
            playPauseBtn: document.getElementById(`play-pause-btn-${deckId}`),
            stopBtn: document.getElementById(`stop-btn-${deckId}`),
            loopBtn: document.getElementById(`loop-btn-${deckId}`),
            volumeSlider: document.getElementById(`volume-${deckId}`),
            trackInfo: document.getElementById(`track-info-${deckId}`),
            progressBar: document.getElementById(`progress-${deckId}`),
            progressContainer: document.getElementById(`progress-container-${deckId}`),
            currentTimeDisplay: document.getElementById(`time-current-${deckId}`),
            totalTimeDisplay: document.getElementById(`time-total-${deckId}`),
            waveformCanvas: document.getElementById(`waveform-${deckId}`),
            tempoSlider: document.getElementById(`tempo-slider-${deckId}`),
            tempoDisplay: document.getElementById(`tempo-display-${deckId}`),
            albumArtElement: document.getElementById(`album-art-${deckId}`),
            vuMeterL: document.getElementById(`vu-meter-L-${deckId}`),
            vuMeterR: document.getElementById(`vu-meter-R-${deckId}`),
            nudgeUpBtn: document.getElementById(`nudge-up-${deckId}`),
            nudgeDownBtn: document.getElementById(`nudge-down-${deckId}`)
        };
    }

    setupEventListeners() {
        [1, 2].forEach(deckId => {
            const elements = this.decks[deckId];
            
            // File input
            elements.fileInput.addEventListener('change', (e) => this.handleFileSelect(deckId, e.target.files[0]));
            
            // Drag and Drop
            elements.container.addEventListener('dragover', (e) => {
                e.preventDefault();
                elements.container.classList.add('drag-over');
            });
            elements.container.addEventListener('dragleave', (e) => {
                e.preventDefault();
                elements.container.classList.remove('drag-over');
            });
            elements.container.addEventListener('drop', (e) => {
                e.preventDefault();
                elements.container.classList.remove('drag-over');
                if (e.dataTransfer.files[0]) {
                    this.handleFileSelect(deckId, e.dataTransfer.files[0]);
                }
            });

            // Transport Controls
            elements.playPauseBtn.addEventListener('click', () => {
                const currentState = stateManager.getState().decks[deckId];
                stateManager.setDeckPlaying(deckId, !currentState.isPlaying);
            });
            elements.stopBtn.addEventListener('click', () => {
                stateManager.setDeckPlaying(deckId, false);
                stateManager.setDeckCurrentTime(deckId, 0);
            });
            elements.loopBtn.addEventListener('click', () => {
                const currentState = stateManager.getState().decks[deckId];
                stateManager.setDeckLooping(deckId, !currentState.isLooping);
            });

            // Sliders
            elements.volumeSlider.addEventListener('input', (e) => stateManager.setDeckVolume(deckId, e.target.value));
            elements.tempoSlider.addEventListener('input', (e) => stateManager.setDeckTempo(deckId, e.target.value));

            // Nudge (Pitch Bend)
            const handleNudge = (val) => stateManager.setDeckNudge(deckId, val);
            elements.nudgeUpBtn.addEventListener('mousedown', () => handleNudge(0.05));
            elements.nudgeDownBtn.addEventListener('mousedown', () => handleNudge(-0.05));
            elements.nudgeUpBtn.addEventListener('mouseup', () => handleNudge(0));
            elements.nudgeDownBtn.addEventListener('mouseup', () => handleNudge(0));
            elements.nudgeUpBtn.addEventListener('mouseleave', () => handleNudge(0));
            elements.nudgeDownBtn.addEventListener('mouseleave', () => handleNudge(0));

            // Scrubbing
            let isScrubbing = false;
            elements.progressContainer.addEventListener('mousedown', (e) => {
                isScrubbing = true;
                this.handleScrubbing(deckId, e, true);
            });
            elements.progressContainer.addEventListener('mousemove', (e) => {
                if (isScrubbing) this.handleScrubbing(deckId, e, false);
            });
            window.addEventListener('mouseup', () => {
                if(isScrubbing) {
                    isScrubbing = false;
                    this.seekTooltip.style.display = 'none';
                }
            });

            // Waveform Interaction
            let isWaveformDragging = false;
            elements.waveformCanvas.addEventListener('mousedown', (e) => {
                isWaveformDragging = true;
                this.handleScrubbing(deckId, e, true, true);
            });
            window.addEventListener('mousemove', (e) => {
                if (isWaveformDragging) this.handleScrubbing(deckId, e, true, true);
            });
            window.addEventListener('mouseup', () => {
                isWaveformDragging = false;
            });
        });

        // Master Controls
        this.master.volume.addEventListener('input', (e) => stateManager.setMasterVolume(e.target.value));
        this.master.crossfader.addEventListener('input', (e) => stateManager.setCrossfader(e.target.value));
        
        this.master.exportBtn.addEventListener('click', () => this.exportSession());
        this.master.importBtn.addEventListener('click', () => this.importSession());
    }

    async handleFileSelect(deckId, file) {
        if (!file || !file.type.startsWith('audio/')) return alert('Please drop a valid audio file.');

        stateManager.setDeckLoading(deckId, true);
        this.decks[deckId].trackInfo.textContent = `Loading: ${file.name}...`;

        // 1. Read Metadata
        if (window.jsmediatags) {
            window.jsmediatags.read(file, {
                onSuccess: (tag) => {
                    const tags = tag.tags;
                    let albumArt = null;
                    if (tags.picture) {
                        let base64String = "";
                        for (let i = 0; i < tags.picture.data.length; i++) {
                            base64String += String.fromCharCode(tags.picture.data[i]);
                        }
                        albumArt = `data:${tags.picture.format};base64,${window.btoa(base64String)}`;
                    }
                    stateManager.setDeckMetadata(deckId, tags.title || file.name, tags.artist, albumArt);
                }
            });
        }

        // 2. Decode Audio
        try {
            const arrayBuffer = await file.arrayBuffer();
            const audioBuffer = await audioEngine.decodeAudio(arrayBuffer);
            stateManager.setDeckBuffer(deckId, audioBuffer);
            this.drawWaveform(deckId, audioBuffer);
        } catch (e) {
            console.error(e);
            this.decks[deckId].trackInfo.textContent = 'Error decoding audio file.';
        } finally {
            stateManager.setDeckLoading(deckId, false);
        }
    }

    handleScrubbing(deckId, event, updateState, fromWaveform = false) {
        const container = fromWaveform ? this.decks[deckId].waveformCanvas : this.decks[deckId].progressContainer;
        const rect = container.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
        const duration = stateManager.getState().decks[deckId].duration;
        const seekTime = percent * duration;
        
        this.seekTooltip.style.left = `${event.pageX}px`;
        this.seekTooltip.style.top = `${event.pageY - 35}px`;
        this.seekTooltip.textContent = this.formatTime(seekTime);
        this.seekTooltip.style.display = 'block';

        if(updateState) {
            stateManager.setDeckCurrentTime(deckId, seekTime);
            // Stutter feedback if paused or explicitly requested
            if (!stateManager.getState().decks[deckId].isPlaying) {
                audioEngine.playStutter(deckId, seekTime);
            }
        }
    }

    formatTime(seconds) {
        if(isNaN(seconds)) return "00:00";
        const min = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60);
        return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    }

    exportSession() {
        const jsonString = JSON.stringify(stateManager.exportSession(), null, 2);
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

    importSession() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => stateManager.importSession(JSON.parse(event.target.result));
            reader.readAsText(file);
        };
        input.click();
    }

    // --- RENDER PIPELINE ---

    render(newState, oldState) {
        [1, 2].forEach(deckId => {
            const state = newState.decks[deckId];
            const old = oldState ? oldState.decks[deckId] : {};
            const el = this.decks[deckId];

            // Buttons Disability
            const canPlay = stateManager.getAudioBuffer(deckId) !== null;
            el.playPauseBtn.disabled = !canPlay;
            el.stopBtn.disabled = !canPlay;
            el.loopBtn.disabled = !canPlay;
            el.volumeSlider.disabled = !canPlay;
            el.tempoSlider.disabled = !canPlay;

            // Metadata UI
            if (state.trackName !== old.trackName || state.artist !== old.artist) {
                if (state.artist && state.trackName) el.trackInfo.textContent = `${state.artist} - ${state.trackName}`;
                else if (state.trackName) el.trackInfo.textContent = state.trackName;
                else el.trackInfo.textContent = "No track loaded";
            }

            if (state.albumArt !== old.albumArt) {
                if (state.albumArt) {
                    el.albumArtElement.src = state.albumArt;
                    el.albumArtElement.style.display = 'block';
                } else {
                    el.albumArtElement.style.display = 'none';
                    el.albumArtElement.src = '';
                }
            }

            // Transport UI
            if (state.isPlaying !== old.isPlaying) {
                el.playPauseBtn.textContent = state.isPlaying ? 'Pause' : 'Play';
            }
            if (state.isLooping !== old.isLooping) {
                el.loopBtn.textContent = `Loop: ${state.isLooping ? 'On' : 'Off'}`;
                el.loopBtn.style.backgroundColor = state.isLooping ? '#4CAF50' : '#555';
            }

            // Time & Progress UI
            if (state.currentTime !== old.currentTime || state.duration !== old.duration) {
                el.currentTimeDisplay.textContent = this.formatTime(state.currentTime);
                el.totalTimeDisplay.textContent = this.formatTime(state.duration);
                if (state.duration > 0) {
                    el.progressBar.value = (state.currentTime / state.duration) * 100;
                } else {
                    el.progressBar.value = 0;
                }
            }

            // Sliders
            if (state.volume !== old.volume) el.volumeSlider.value = state.volume;
            if (state.tempoPercentage !== old.tempoPercentage) {
                el.tempoSlider.value = state.tempoPercentage;
                const sign = state.tempoPercentage >= 0 ? '+' : '';
                el.tempoDisplay.textContent = `${sign}${state.tempoPercentage}%`;
            }

            // VU Meters
            if (state.rmsL !== old.rmsL) this.drawMeter(el.vuMeterL, state.rmsL);
            if (state.rmsR !== old.rmsR) this.drawMeter(el.vuMeterR, state.rmsR);
        });

        // Master UI
        if (!oldState || newState.master.volume !== oldState.master.volume) this.master.volume.value = newState.master.volume;
        if (!oldState || newState.master.crossfader !== oldState.master.crossfader) this.master.crossfader.value = newState.master.crossfader;
    }

    drawWaveform(deckId, audioBuffer) {
        const canvas = this.decks[deckId].waveformCanvas;
        const ctx = canvas.getContext('2d');
        const channelData = audioBuffer.getChannelData(0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const samplesPerPixel = Math.floor(channelData.length / canvas.width);
        const filteredData = [];
        for (let i = 0; i < canvas.width; i++) {
            let sum = 0;
            for (let j = 0; j < samplesPerPixel; j++) sum += Math.abs(channelData[i * samplesPerPixel + j] || 0);
            filteredData.push(sum / samplesPerPixel);
        }
        const scale = canvas.height / 2 / Math.max(...filteredData);
        ctx.fillStyle = '#3498db';
        ctx.beginPath();
        for (let i = 0; i < filteredData.length; i++) {
            const val = filteredData[i] * scale;
            ctx.fillRect(i, (canvas.height - val) / 2, 1, val);
        }
    }

    drawMeter(canvas, rmsValue) {
        const ctx = canvas.getContext('2d');
        const meterHeight = rmsValue * canvas.height * 2.5;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#00ff00');
        gradient.addColorStop(0.75, '#ffff00');
        gradient.addColorStop(1, '#ff0000');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, canvas.height - meterHeight, canvas.width, meterHeight);
    }

    drawSpectrum() {
        const canvas = this.master.spectrumCanvas;
        const ctx = canvas.getContext('2d');
        const analyser = audioEngine.analyser;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const loop = () => {
            requestAnimationFrame(loop);
            analyser.getByteFrequencyData(dataArray);
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            const barWidth = (canvas.width / bufferLength) * 2;
            let x = 0;
            for (let i = 0; i < bufferLength; i++) {
                const barHeight = dataArray[i] / 2;
                const r = 70 + (barHeight * 1.5);
                const g = 100;
                const b = 250 - barHeight;
                ctx.fillStyle = `rgb(${r},${g},${b})`;
                ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
                x += barWidth + 1;
            }
        };
        loop();
    }
}

export const uiEngine = new UIEngine();
