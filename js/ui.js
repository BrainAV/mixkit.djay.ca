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
        const fftSize = audioEngine.analyser.frequencyBinCount;
        this.peaks = new Float32Array(fftSize);
        this.spectrumDataArray = new Uint8Array(fftSize);
        this.spectrumVertexBuffer = new Float32Array(fftSize * 12);
        this.peakVertexBuffer = new Float32Array(fftSize * 12);
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

        // Offscreen canvases for static waveform data (Now using WebGL)
        this.waveformGL = {
            1: this.initWebGLWaveform(1),
            2: this.initWebGLWaveform(2)
        };

        // Animation state for Imaging
        this.imagingProgress = { 1: 0, 2: 0 };
        this.isImaging = { 1: false, 2: false };

        // Pre-allocated buffers for batching (max 800 bars for waveform, 15 for VU)
        this.waveformVertexBuffer = new Float32Array(800 * 6 * 2);
        this.vuVertexBuffer = new Float32Array(15 * 6 * 2);

        this.vuGL = {
            '1L': this.initWebGLVU(1, 'L'),
            '1R': this.initWebGLVU(1, 'R'),
            '2L': this.initWebGLVU(2, 'L'),
            '2R': this.initWebGLVU(2, 'R')
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
                if (isScrubbing) {
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
            this.startImaging(deckId, audioBuffer);
        } catch (e) {
            console.error(e);
            this.decks[deckId].trackInfo.textContent = 'Error decoding audio file.';
        } finally {
            stateManager.setDeckLoading(deckId, false);
        }
    }

    initWebGLWaveform(deckId) {
        const canvas = document.getElementById(`waveform-${deckId}`);
        // Ensure internal resolution matches CSS size
        canvas.width = canvas.clientWidth || 800;
        canvas.height = canvas.clientHeight || 100;

        const gl = canvas.getContext('webgl');
        if (!gl) return null;

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

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        return {
            gl,
            program,
            canvas,
            positionBuffer: gl.createBuffer(),
            posLoc: gl.getAttribLocation(program, "a_position"),
            colorLoc: gl.getUniformLocation(program, "u_color"),
            data: null // Will hold the static filtered data
        };
    }

    startImaging(deckId, audioBuffer) {
        const data = this.calculateWaveformData(audioBuffer, 800); // 800 points for HD
        this.waveformGL[deckId].data = data;
        this.imagingProgress[deckId] = 0;
        this.isImaging[deckId] = true;
    }

    calculateWaveformData(audioBuffer, width) {
        const channelData = audioBuffer.getChannelData(0);
        const samplesPerPixel = Math.floor(channelData.length / width);
        const filteredData = new Float32Array(width);
        for (let i = 0; i < width; i++) {
            let sum = 0;
            for (let j = 0; j < samplesPerPixel; j++) sum += Math.abs(channelData[i * samplesPerPixel + j] || 0);
            filteredData[i] = sum / samplesPerPixel;
        }
        // Normalize
        const max = Math.max(...filteredData);
        if (max > 0) {
            for (let i = 0; i < width; i++) filteredData[i] /= max;
        }
        return filteredData;
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

        if (updateState) {
            stateManager.setDeckCurrentTime(deckId, seekTime);
            // Stutter feedback if paused or explicitly requested
            if (!stateManager.getState().decks[deckId].isPlaying) {
                audioEngine.playStutter(deckId, seekTime);
            }
        }
    }

    formatTime(seconds) {
        if (isNaN(seconds)) return "00:00";
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
        [1, 2].forEach(deckId => {
            const wgl = this.waveformGL[deckId];
            if (!wgl || !wgl.data) return;

            const { gl, program, positionBuffer, posLoc, colorLoc, data } = wgl;
            const state = stateManager.getState().decks[deckId];
            
            // Sync resolution to actual display size
            const displayWidth = gl.canvas.clientWidth || 800;
            const displayHeight = gl.canvas.clientHeight || 100;
            if (gl.canvas.width !== displayWidth || gl.canvas.height !== displayHeight) {
                gl.canvas.width = displayWidth;
                gl.canvas.height = displayHeight;
            }

            gl.useProgram(program);
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
            
            // Transparent clear
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);

            // 1. Determine how many bars to draw
            const totalBars = data.length;
            const activeBars = this.isImaging[deckId] ? Math.floor(this.imagingProgress[deckId] * totalBars) : totalBars;
            
            if (activeBars > 0) {
                // 2. Batch the geometry
                const vertices = this.waveformVertexBuffer;
                const barWidth = 2.0 / totalBars;
                const actualBarWidth = barWidth * 0.9;

                for (let i = 0; i < activeBars; i++) {
                    const val = data[i] || 0;
                    const x = -1.0 + (i * barWidth);
                    const y = -val;
                    const h = val * 2;
                    const offset = i * 12;

                    vertices[offset] = x; vertices[offset + 1] = y;
                    vertices[offset + 2] = x + actualBarWidth; vertices[offset + 3] = y;
                    vertices[offset + 4] = x; vertices[offset + 5] = y + h;
                    vertices[offset + 6] = x; vertices[offset + 7] = y + h;
                    vertices[offset + 8] = x + actualBarWidth; vertices[offset + 9] = y;
                    vertices[offset + 10] = x + actualBarWidth; vertices[offset + 11] = y + h;
                }

                // 3. Batch Draw (Main Waveform)
                gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, vertices.subarray(0, activeBars * 12), gl.DYNAMIC_DRAW);
                gl.enableVertexAttribArray(posLoc);
                gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
                
                // Blue color
                gl.uniform4fv(colorLoc, [0.2, 0.6, 1.0, 0.9]);
                gl.drawArrays(gl.TRIANGLES, 0, activeBars * 6);

                // 4. Draw Played Overlay (White/Transparent)
                if (state.duration > 0 && !this.isImaging[deckId]) {
                    const progress = state.currentTime / state.duration;
                    const playedBars = Math.floor(progress * totalBars);
                    if (playedBars > 0) {
                        gl.uniform4fv(colorLoc, [1.0, 1.0, 1.0, 0.4]);
                        gl.drawArrays(gl.TRIANGLES, 0, Math.min(playedBars, activeBars) * 6);
                    }

                    // 5. Draw Playhead
                    const xHead = -1.0 + (progress * 2.0);
                    this.drawGLRectInternal(gl, posLoc, colorLoc, positionBuffer, xHead - 0.005, -1.0, 0.01, 2.0, [1.0, 1.0, 1.0, 1.0]);
                }
            }

            // 6. Update Imaging Animation
            if (this.isImaging[deckId]) {
                this.imagingProgress[deckId] = Math.min(1.0, this.imagingProgress[deckId] + 0.04);
                if (this.imagingProgress[deckId] >= 1.0) {
                    this.isImaging[deckId] = false;
                }
            }
        });
    }

    drawGLRectInternal(gl, posLoc, colorLoc, buffer, x, y, width, height, color) {
        const positions = new Float32Array([
            x, y,
            x + width, y,
            x, y + height,
            x, y + height,
            x + width, y,
            x + width, y + height,
        ]);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
        gl.uniform4fv(colorLoc, color);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
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
            // VU Meters
            if (state.rmsL !== old.rmsL) this.drawMeter(deckId, 'L', state.rmsL);
            if (state.rmsR !== old.rmsR) this.drawMeter(deckId, 'R', state.rmsR);
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

    initWebGLVU(deckId, side) {
        const canvas = document.getElementById(`vu-meter-${side}-${deckId}`);
        const gl = canvas.getContext('webgl');
        if (!gl) return null;

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

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        return {
            gl,
            program,
            canvas,
            positionBuffer: gl.createBuffer(),
            posLoc: gl.getAttribLocation(program, "a_position"),
            colorLoc: gl.getUniformLocation(program, "u_color")
        };
    }

    drawMeter(deckId, side, rmsValue) {
        const vugl = this.vuGL[`${deckId}${side}`];
        if (!vugl) return;

        const { gl, posLoc, colorLoc, positionBuffer, program } = vugl;
        const value = Math.min(1.0, rmsValue * 2.5);

        // Sync resolution
        if (gl.canvas.width !== gl.canvas.clientWidth || gl.canvas.height !== gl.canvas.clientHeight) {
            gl.canvas.width = gl.canvas.clientWidth;
            gl.canvas.height = gl.canvas.clientHeight;
        }

        gl.useProgram(program);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        const segments = 15;
        const spacing = 0.05;
        const segHeight = (2.0 / segments) - spacing;

        // Batch LEDs based on color zones
        const activeSegments = Math.floor(value * segments);
        if (activeSegments <= 0) return;

        const vertices = this.vuVertexBuffer;
        for (let i = 0; i < activeSegments; i++) {
            const segBottom = -1.0 + (i * (segHeight + spacing));
            const offset = i * 12;
            vertices[offset] = -1.0; vertices[offset + 1] = segBottom;
            vertices[offset + 2] = 1.0; vertices[offset + 3] = segBottom;
            vertices[offset + 4] = -1.0; vertices[offset + 5] = segBottom + segHeight;
            vertices[offset + 6] = -1.0; vertices[offset + 7] = segBottom + segHeight;
            vertices[offset + 8] = 1.0; vertices[offset + 9] = segBottom;
            vertices[offset + 10] = 1.0; vertices[offset + 11] = segBottom + segHeight;
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices.subarray(0, activeSegments * 12), gl.STREAM_DRAW);
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        // Draw in color zones
        const greenCount = Math.min(activeSegments, 9); // ~60%
        const yellowCount = Math.min(activeSegments - greenCount, 4); // ~25%
        const redCount = Math.max(0, activeSegments - greenCount - yellowCount);

        if (greenCount > 0) {
            gl.uniform4fv(colorLoc, [0.0, 1.0, 0.0, 1.0]);
            gl.drawArrays(gl.TRIANGLES, 0, greenCount * 6);
        }
        if (yellowCount > 0) {
            gl.uniform4fv(colorLoc, [1.0, 1.0, 0.0, 1.0]);
            gl.drawArrays(gl.TRIANGLES, greenCount * 6, yellowCount * 6);
        }
        if (redCount > 0) {
            gl.uniform4fv(colorLoc, [1.0, 0.0, 0.0, 1.0]);
            gl.drawArrays(gl.TRIANGLES, (greenCount + yellowCount) * 6, redCount * 6);
        }
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
        const dataArray = this.spectrumDataArray;
        analyser.getByteFrequencyData(dataArray);

        if (!this.gl) {
            this.drawSpectrum2D(dataArray);
            return;
        }

        const gl = this.gl;
        const displayWidth = Math.floor(gl.canvas.clientWidth);
        const displayHeight = Math.floor(gl.canvas.clientHeight);
        
        if (gl.canvas.width !== displayWidth || gl.canvas.height !== displayHeight) {
            gl.canvas.width = displayWidth;
            gl.canvas.height = displayHeight;
        }

        gl.useProgram(this.glProgram);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        const barWidth = 2.0 / bufferLength;
        const actualBarWidth = barWidth * 0.8;
        const decay = 0.94; // Snappier decay for pro feel
        
        const barVertices = this.spectrumVertexBuffer;
        const peakVertices = this.peakVertexBuffer;
        let peakCount = 0;

        for (let i = 0; i < bufferLength; i++) {
            const value = dataArray[i] / 255.0;
            const x = -1.0 + (i * barWidth);
            const offset = i * 12;

            // Update Peaks
            if (value >= this.peaks[i]) {
                this.peaks[i] = value;
            } else {
                this.peaks[i] *= decay;
            }

            // Batch Bar
            const barY = -1.0;
            const barH = value * 2.0;
            barVertices[offset] = x; barVertices[offset + 1] = barY;
            barVertices[offset + 2] = x + actualBarWidth; barVertices[offset + 3] = barY;
            barVertices[offset + 4] = x; barVertices[offset + 5] = barY + barH;
            barVertices[offset + 6] = x; barVertices[offset + 7] = barY + barH;
            barVertices[offset + 8] = x + actualBarWidth; barVertices[offset + 9] = barY;
            barVertices[offset + 10] = x + actualBarWidth; barVertices[offset + 11] = barY + barH;

            // Batch Peak
            if (this.peaks[i] > 0.01) {
                const py = -1.0 + (this.peaks[i] * 2.0);
                const ph = 0.02;
                const pOffset = peakCount * 12;
                peakVertices[pOffset] = x; peakVertices[pOffset + 1] = py;
                peakVertices[pOffset + 2] = x + actualBarWidth; peakVertices[pOffset + 3] = py;
                peakVertices[pOffset + 4] = x; peakVertices[pOffset + 5] = py + ph;
                peakVertices[pOffset + 6] = x; peakVertices[pOffset + 7] = py + ph;
                peakVertices[pOffset + 8] = x + actualBarWidth; peakVertices[pOffset + 9] = py;
                peakVertices[pOffset + 10] = x + actualBarWidth; peakVertices[pOffset + 11] = py + ph;
                peakCount++;
            }
        }

        // 1. Draw Bars (Gradient-ish effect using value)
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, barVertices, gl.STREAM_DRAW);
        const posLoc = gl.getAttribLocation(this.glProgram, "a_position");
        const colorLoc = gl.getUniformLocation(this.glProgram, "u_color");
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        gl.uniform4fv(colorLoc, [0.4, 0.6, 1.0, 1.0]);
        gl.drawArrays(gl.TRIANGLES, 0, bufferLength * 6);

        // 2. Draw Peaks
        if (peakCount > 0) {
            gl.bufferData(gl.ARRAY_BUFFER, peakVertices.subarray(0, peakCount * 12), gl.STREAM_DRAW);
            gl.uniform4fv(colorLoc, [1.0, 1.0, 1.0, 0.8]);
            gl.drawArrays(gl.TRIANGLES, 0, peakCount * 6);
        }
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
