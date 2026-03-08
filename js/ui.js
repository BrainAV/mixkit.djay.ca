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
        
        // WebGL for Master Spectrum
        this.gl = this.initWebGLSpectrum();
        this.peaks = new Float32Array(audioEngine.analyser.frequencyBinCount);
        this.peakHoldValues = new Float32Array(audioEngine.analyser.frequencyBinCount);
        this.lastPeakUpdate = 0;

        this.settings = {
            modal: document.getElementById('settings-modal'),
            toggleBtn: document.getElementById('settings-toggle-btn'),
            closeBtn: document.getElementById('settings-close-btn'),
            tempoRange: document.getElementById('setting-tempo-range'),
            crossfaderCurve: document.getElementById('setting-crossfader-curve'),
            latency: document.getElementById('setting-latency'),
            theme: document.getElementById('setting-theme')
        };

        this.seekTooltip = document.getElementById('seek-tooltip');

        // Offscreen canvases for static waveform data
        this.offscreenWaveforms = {
            1: document.createElement('canvas'),
            2: document.createElement('canvas')
        };

        this.setupEventListeners();
        stateManager.subscribe(this.render.bind(this));

        // Start global animation loop for spectrum and waveforms
        this.startAnimationLoop();
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

        // Settings Listeners
        this.settings.toggleBtn.addEventListener('click', () => this.toggleSettings(true));
        this.settings.closeBtn.addEventListener('click', () => this.toggleSettings(false));
        
        this.settings.tempoRange.addEventListener('change', (e) => stateManager.setSetting('tempoRange', parseInt(e.target.value)));
        this.settings.crossfaderCurve.addEventListener('change', (e) => stateManager.setSetting('crossfaderCurve', e.target.value));
        this.settings.latency.addEventListener('input', (e) => stateManager.setSetting('latency', parseInt(e.target.value)));
        this.settings.theme.addEventListener('change', (e) => stateManager.setSetting('theme', e.target.value));

        // Click outside modal to close
        this.settings.modal.addEventListener('click', (e) => {
            if (e.target === this.settings.modal) this.toggleSettings(false);
        });
    }

    toggleSettings(show) {
        this.settings.modal.style.display = show ? 'flex' : 'none';
        if (show) {
            // Populate inputs with current state
            const state = stateManager.getState().settings;
            this.settings.tempoRange.value = state.tempoRange;
            this.settings.crossfaderCurve.value = state.crossfaderCurve;
            this.settings.latency.value = state.latency;
            this.settings.theme.value = state.theme;
        }
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

    startAnimationLoop() {
        const loop = () => {
            requestAnimationFrame(loop);
            this.drawSpectrum();
            this.drawWaveforms();
        };
        loop();
    }

    drawWaveforms() {
        const state = stateManager.getState();
        [1, 2].forEach(deckId => {
            const deckState = state.decks[deckId];
            const canvas = this.decks[deckId].waveformCanvas;
            const ctx = canvas.getContext('2d');
            const offscreen = this.offscreenWaveforms[deckId];

            if (!deckState.duration) return;

            // 1. Clear and draw static waveform
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(offscreen, 0, 0);

            // 2. Draw Playhead
            const progress = deckState.currentTime / deckState.duration;
            const playheadX = progress * canvas.width;

            ctx.lineWidth = 2;
            ctx.strokeStyle = '#ffffff'; // White playhead
            ctx.beginPath();
            ctx.moveTo(playheadX, 0);
            ctx.lineTo(playheadX, canvas.height);
            ctx.stroke();

            // 3. Optional: Subtle overlay for "already played" section
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.fillRect(0, 0, playheadX, canvas.height);
        });
    }

    drawWaveform(deckId, audioBuffer) {
        const mainCanvas = this.decks[deckId].waveformCanvas;
        const offscreen = this.offscreenWaveforms[deckId];
        
        // Match offscreen size to main canvas
        offscreen.width = mainCanvas.width;
        offscreen.height = mainCanvas.height;
        
        const ctx = offscreen.getContext('2d');
        const channelData = audioBuffer.getChannelData(0);
        ctx.clearRect(0, 0, offscreen.width, offscreen.height);
        
        const samplesPerPixel = Math.floor(channelData.length / offscreen.width);
        const filteredData = [];
        for (let i = 0; i < offscreen.width; i++) {
            let sum = 0;
            for (let j = 0; j < samplesPerPixel; j++) sum += Math.abs(channelData[i * samplesPerPixel + j] || 0);
            filteredData.push(sum / samplesPerPixel);
        }
        const scale = offscreen.height / 2 / Math.max(...filteredData);
        ctx.fillStyle = '#3498db';
        for (let i = 0; i < filteredData.length; i++) {
            const val = filteredData[i] * scale;
            ctx.fillRect(i, (offscreen.height - val) / 2, 1, val);
        }
    }

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

        // Settings UI Reactivity
        if (!oldState || newState.settings.tempoRange !== oldState.settings.tempoRange) {
            const range = newState.settings.tempoRange;
            [1, 2].forEach(id => {
                this.decks[id].tempoSlider.min = -range;
                this.decks[id].tempoSlider.max = range;
            });
        }

        if (!oldState || newState.settings.theme !== oldState.settings.theme) {
            if (newState.settings.theme === 'dark') {
                document.body.classList.add('pro-dark');
                this.settings.modal.children[0].classList.remove('glass');
            } else {
                document.body.classList.remove('pro-dark');
                this.settings.modal.children[0].classList.add('glass');
            }
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

    initWebGLSpectrum() {
        const canvas = this.master.spectrumCanvas;
        const gl = canvas.getContext('webgl');
        if (!gl) return null;

        // Shaders
        const vsSource = `
            attribute vec2 a_position;
            void main() {
                gl_Position = vec4(a_position, 0, 1);
            }
        `;
        const fsSource = `
            precision mediump float;
            uniform vec4 u_color;
            void main() {
                gl_FragColor = u_color;
            }
        `;

        const createShader = (gl, type, source) => {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            return shader;
        };

        const program = gl.createProgram();
        gl.attachShader(program, createShader(gl, gl.VERTEX_SHADER, vsSource));
        gl.attachShader(program, createShader(gl, gl.FRAGMENT_SHADER, fsSource));
        gl.linkProgram(program);
        gl.useProgram(program);

        this.glProgram = program;
        this.positionBuffer = gl.createBuffer();
        
        return gl;
    }

    drawSpectrum() {
        const analyser = audioEngine.analyser;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        if (!this.gl) {
            // Fallback to Canvas 2D if WebGL fails
            this.drawSpectrum2D(dataArray);
            return;
        }

        const gl = this.gl;
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        const barWidth = 2.0 / bufferLength;
        const now = performance.now();
        const decay = 0.95; // Peak decay speed

        for (let i = 0; i < bufferLength; i++) {
            const value = dataArray[i] / 255.0; // 0 to 1
            const x = -1.0 + (i * barWidth);
            
            // Peak Holding Logic
            if (value >= this.peaks[i]) {
                this.peaks[i] = value;
                this.peakHoldValues[i] = 1.0; 
            } else {
                this.peaks[i] *= decay;
            }

            // Draw Bar
            this.drawGLRect(x, -1.0, barWidth * 0.8, value * 2.0, [0.2 + value, 0.4, 0.9 - value, 1.0]);
            
            // Draw Peak Line
            if (this.peaks[i] > 0.01) {
                this.drawGLRect(x, -1.0 + (this.peaks[i] * 2.0), barWidth * 0.8, 0.02, [1.0, 1.0, 1.0, 0.8]);
            }
        }
    }

    drawGLRect(x, y, width, height, color) {
        const gl = this.gl;
        const program = this.glProgram;
        
        const positionLocation = gl.getAttribLocation(program, "a_position");
        const colorLocation = gl.getUniformLocation(program, "u_color");

        const positions = new Float32Array([
            x, y,
            x + width, y,
            x, y + height,
            x, y + height,
            x + width, y,
            x + width, y + height,
        ]);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
        gl.uniform4fv(colorLocation, color);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    drawSpectrum2D(dataArray) {
        const canvas = this.master.spectrumCanvas;
        const ctx = canvas.getContext('2d');
        const bufferLength = dataArray.length;
        
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
    }
}

export const uiEngine = new UIEngine();
