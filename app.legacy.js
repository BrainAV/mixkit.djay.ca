document.addEventListener('DOMContentLoaded', () => {
    // --- Audio Context Setup ---
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const masterGain = audioCtx.createGain();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    masterGain.connect(analyser);
    analyser.connect(audioCtx.destination);

    const seekTooltip = document.getElementById('seek-tooltip');

    // --- Deck Class ---
    class Deck {
        constructor(deckId) {
            this.deckId = deckId;
            this.deckElement = document.getElementById(`deck${deckId}`);
            this.audioBuffer = null;
            this.sourceNode = null;
            this.gainNode = audioCtx.createGain();
            this.crossfaderGainNode = audioCtx.createGain();
            this.splitterNode = audioCtx.createChannelSplitter(2);
            this.analyserNodeL = audioCtx.createAnalyser();
            this.analyserNodeR = audioCtx.createAnalyser();
            this.analyserNodeL.fftSize = 2048;
            this.analyserNodeR.fftSize = 2048;
            this.isPlaying = false;
            this.isLooping = false;
            this.startTime = 0;
            this.pauseOffset = 0;
            this.playbackRate = 1.0;
            this.isScrubbing = false;

            this.gainNode.connect(this.crossfaderGainNode);
            this.gainNode.connect(this.splitterNode);
            this.splitterNode.connect(this.analyserNodeL, 0);
            this.splitterNode.connect(this.analyserNodeR, 1);
            this.crossfaderGainNode.connect(masterGain);

            // --- UI Elements ---
            this.fileInput = document.getElementById(`file-input-${deckId}`);
            this.playPauseBtn = document.getElementById(`play-pause-btn-${deckId}`);
            this.stopBtn = document.getElementById(`stop-btn-${deckId}`);
            this.loopBtn = document.getElementById(`loop-btn-${deckId}`);
            this.volumeSlider = document.getElementById(`volume-${deckId}`); // Updated to mixer slider
            this.trackInfo = document.getElementById(`track-info-${deckId}`);
            this.progressBar = document.getElementById(`progress-${deckId}`);
            this.progressContainer = document.getElementById(`progress-container-${deckId}`);
            this.currentTimeDisplay = document.getElementById(`time-current-${deckId}`);
            this.totalTimeDisplay = document.getElementById(`time-total-${deckId}`);
            this.waveformCanvas = document.getElementById(`waveform-${deckId}`);
            this.tempoSlider = document.getElementById(`tempo-slider-${deckId}`);
            this.tempoDisplay = document.getElementById(`tempo-display-${deckId}`);
            this.albumArtElement = document.getElementById(`album-art-${deckId}`);
            this.vuMeterL = document.getElementById(`vu-meter-L-${deckId}`);
            this.vuMeterR = document.getElementById(`vu-meter-R-${deckId}`);

            // Initially disable controls
            this.playPauseBtn.disabled = true;
            this.stopBtn.disabled = true;
            this.loopBtn.disabled = true;
            this.volumeSlider.disabled = true;
            this.tempoSlider.disabled = true;

            // --- Event Listeners ---
            this.fileInput.addEventListener('change', this.loadFile.bind(this));
            this.playPauseBtn.addEventListener('click', this.togglePlayPause.bind(this));
            this.stopBtn.addEventListener('click', this.stop.bind(this));
            this.loopBtn.addEventListener('click', this.toggleLoop.bind(this));
            this.volumeSlider.addEventListener('input', (e) => {
                this.gainNode.gain.value = e.target.value;
            });
            this.tempoSlider.addEventListener('input', this.updateTempo.bind(this));
            this.progressContainer.addEventListener('mousedown', this.handleScrubbingStart.bind(this));
            this.progressContainer.addEventListener('mousemove', this.handleScrubbingMove.bind(this));
            this.progressContainer.addEventListener('mouseup', this.handleScrubbingEnd.bind(this));
            this.progressContainer.addEventListener('mouseleave', this.handleScrubbingEnd.bind(this));
            this.deckElement.addEventListener('dragover', this.handleDragOver.bind(this));
            this.deckElement.addEventListener('dragleave', this.handleDragLeave.bind(this));
            this.deckElement.addEventListener('drop', this.handleDrop.bind(this));
        }

        loadFile(event) {
            const file = event.target.files[0];
            if (file) {
                this.loadTrack(file);
            }
        }

        async loadTrack(file) {
            if (!file.type.startsWith('audio/')) {
                alert('Please drop a valid audio file.');
                return;
            }
            this.stop();
            this.trackInfo.textContent = `Loading: ${file.name}...`;
            this.loadMetadata(file);
            try {
                const arrayBuffer = await file.arrayBuffer();
                this.audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
                if (this.trackInfo.textContent === `Loading: ${file.name}...`) {
                    this.trackInfo.textContent = file.name;
                }
                this.totalTimeDisplay.textContent = this.formatTime(this.audioBuffer.duration);
                this.drawWaveform();
                this.playPauseBtn.disabled = false;
                this.stopBtn.disabled = false;
                this.loopBtn.disabled = false;
                this.volumeSlider.disabled = false;
                this.tempoSlider.disabled = false;
            } catch (err) {
                this.trackInfo.textContent = 'Error decoding audio file.';
                console.error(`Error for deck ${this.deckId}:`, err);
            }
        }

        togglePlayPause() {
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
            this.sourceNode.playbackRate.value = this.playbackRate;
            this.sourceNode.connect(this.gainNode);
            const offset = this.pauseOffset % this.audioBuffer.duration;
            this.sourceNode.start(0, offset);
            this.startTime = audioCtx.currentTime - offset;
            this.isPlaying = true;
            this.playPauseBtn.textContent = 'Pause';
            requestAnimationFrame(this.updateProgress.bind(this));
        }

        pause() {
            if (!this.sourceNode || !this.isPlaying) return;
            this.sourceNode.stop();
            this.sourceNode = null;
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
            if (!this.isPlaying) {
                this.drawVUMeter(0, 0);
                return;
            }
            this.drawVUMeter();
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
            this.tempoSlider.value = 0;
            this.tempoDisplay.textContent = '+0.0%';
            this.playbackRate = 1.0;
            const canvas = this.waveformCanvas;
            const ctx = canvas.getContext('2d');
            const channelData = this.audioBuffer.getChannelData(0);
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            ctx.clearRect(0, 0, canvasWidth, canvasHeight);
            const samplesPerPixel = Math.floor(channelData.length / canvasWidth);
            const filteredData = [];
            for (let i = 0; i < canvasWidth; i++) {
                const blockStart = samplesPerPixel * i;
                let sum = 0;
                for (let j = 0; j < samplesPerPixel; j++) {
                    sum += Math.abs(channelData[blockStart + j] || 0);
                }
                filteredData.push(sum / samplesPerPixel);
            }
            const maxVal = Math.max(...filteredData);
            const scale = canvasHeight / 2 / maxVal;
            ctx.fillStyle = '#3498db';
            ctx.beginPath();
            for (let i = 0; i < filteredData.length; i++) {
                const val = filteredData[i] * scale;
                const y = (canvasHeight - val) / 2;
                ctx.fillRect(i, y, 1, val);
            }
        }

        updateTempo(event) {
            const tempoPercentage = parseFloat(event.target.value);
            this.playbackRate = 1.0 + (tempoPercentage / 100.0);
            if (this.sourceNode) {
                this.sourceNode.playbackRate.value = this.playbackRate;
            }
            const sign = tempoPercentage >= 0 ? '+' : '';
            this.tempoDisplay.textContent = `${sign}${tempoPercentage.toFixed(1)}%`;
        }

        loadMetadata(file) {
            this.albumArtElement.style.display = 'none';
            this.albumArtElement.src = '';
            if (!window.jsmediatags) {
                console.error("jsmediatags library not found.");
                return;
            }
            window.jsmediatags.read(file, {
                onSuccess: (tag) => {
                    const tags = tag.tags;
                    if (tags.title && tags.artist) {
                        this.trackInfo.textContent = `${tags.artist} - ${tags.title}`;
                    } else if (tags.title) {
                        this.trackInfo.textContent = tags.title;
                    }
                    if (tags.picture) {
                        const { data, format } = tags.picture;
                        let base64String = "";
                        for (let i = 0; i < data.length; i++) {
                            base64String += String.fromCharCode(data[i]);
                        }
                        this.albumArtElement.src = `data:${format};base64,${window.btoa(base64String)}`;
                        this.albumArtElement.style.display = 'block';
                    }
                },
                onError: (error) => {
                    console.log(`Could not read metadata for ${file.name}:`, error.type, error.info);
                }
            });
        }

        handleScrubbingStart(event) {
            if (!this.audioBuffer) return;
            this.isScrubbing = true;
            this.handleScrubbingMove(event);
        }

        handleScrubbingMove(event) {
            if (!this.isScrubbing || !this.audioBuffer) return;
            const rect = this.progressContainer.getBoundingClientRect();
            const percent = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
            const seekTime = percent * this.audioBuffer.duration;
            this.progressBar.value = percent * 100;
            this.currentTimeDisplay.textContent = this.formatTime(seekTime);
            seekTooltip.style.left = `${event.pageX}px`;
            seekTooltip.style.top = `${event.pageY - 35}px`;
            seekTooltip.textContent = this.formatTime(seekTime);
            seekTooltip.style.display = 'block';
        }

        handleScrubbingEnd(event) {
            if (!this.isScrubbing) return;
            this.isScrubbing = false;
            seekTooltip.style.display = 'none';
            const rect = this.progressContainer.getBoundingClientRect();
            const percent = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
            const seekTime = percent * this.audioBuffer.duration;
            this.seek(seekTime);
        }

        seek(time) {
            if (!this.audioBuffer) return;
            this.pauseOffset = time;
            if (this.isPlaying) {
                if(this.sourceNode) {
                    this.sourceNode.stop();
                }
                this.isPlaying = false;
                this.play();
            } else {
                this.progressBar.value = (this.pauseOffset / this.audioBuffer.duration) * 100;
                this.currentTimeDisplay.textContent = this.formatTime(this.pauseOffset);
            }
        }

        drawVUMeter() {
            const bufferLengthL = this.analyserNodeL.frequencyBinCount;
            const dataArrayL = new Float32Array(bufferLengthL);
            this.analyserNodeL.getFloatTimeDomainData(dataArrayL);
            const bufferLengthR = this.analyserNodeR.frequencyBinCount;
            const dataArrayR = new Float32Array(bufferLengthR);
            this.analyserNodeR.getFloatTimeDomainData(dataArrayR);
            let sumL = 0;
            for(let i = 0; i < dataArrayL.length; i++) {
                sumL += dataArrayL[i] * dataArrayL[i];
            }
            const rmsL = Math.sqrt(sumL / dataArrayL.length);
            let sumR = 0;
            for(let i = 0; i < dataArrayR.length; i++) {
                sumR += dataArrayR[i] * dataArrayR[i];
            }
            const rmsR = Math.sqrt(sumR / dataArrayR.length);
            this.drawMeter(this.vuMeterL, rmsL);
            this.drawMeter(this.vuMeterR, rmsR);
        }

        drawMeter(canvas, rmsValue) {
            const ctx = canvas.getContext('2d');
            const WIDTH = canvas.width;
            const HEIGHT = canvas.height;
            const meterHeight = rmsValue * HEIGHT * 2.5;
            ctx.clearRect(0, 0, WIDTH, HEIGHT);
            const gradient = ctx.createLinearGradient(0, HEIGHT, 0, 0);
            gradient.addColorStop(0, '#00ff00');
            gradient.addColorStop(0.75, '#ffff00');
            gradient.addColorStop(1, '#ff0000');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, HEIGHT - meterHeight, WIDTH, meterHeight);
        }

        handleDragOver(event) {
            event.preventDefault();
            this.deckElement.classList.add('drag-over');
        }

        handleDragLeave(event) {
            event.preventDefault();
            this.deckElement.classList.remove('drag-over');
        }

        handleDrop(event) {
            event.preventDefault();
            this.deckElement.classList.remove('drag-over');
            const file = event.dataTransfer.files[0];
            if (file) {
                this.loadTrack(file);
            }
        }
    }

    const deck1 = new Deck(1);
    const deck2 = new Deck(2);

    const masterVolumeSlider = document.getElementById('master-volume');
    masterVolumeSlider.addEventListener('input', (e) => {
        masterGain.gain.value = e.target.value;
    });

    const crossfader = document.getElementById('crossfader');
    const setupCrossfader = () => {
        const value = parseFloat(crossfader.value);
        const gain1 = Math.cos((value + 1) * 0.25 * Math.PI);
        const gain2 = Math.cos((1 - value) * 0.25 * Math.PI);
        deck1.crossfaderGainNode.gain.value = gain1;
        deck2.crossfaderGainNode.gain.value = gain2;
    };
    crossfader.addEventListener('input', setupCrossfader);
    setupCrossfader();

    const spectrumCanvas = document.getElementById('master-spectrum');
    const spectrumCtx = spectrumCanvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function drawSpectrum() {
        requestAnimationFrame(drawSpectrum);
        analyser.getByteFrequencyData(dataArray);
        spectrumCtx.fillStyle = '#000';
        spectrumCtx.fillRect(0, 0, spectrumCanvas.width, spectrumCanvas.height);
        const barWidth = (spectrumCanvas.width / bufferLength) * 2;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
            const barHeight = dataArray[i] / 2;
            const r = 70 + (barHeight * 1.5);
            const g = 100;
            const b = 250 - (barHeight);
            spectrumCtx.fillStyle = `rgb(${r},${g},${b})`;
            spectrumCtx.fillRect(x, spectrumCanvas.height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }
    }
    drawSpectrum();

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
        if (state.master) {
            masterVolumeSlider.value = state.master.volume;
            masterGain.gain.value = state.master.volume;
            crossfader.value = state.master.crossfader;
            setupCrossfader();
        }
    }

    exportBtn.addEventListener('click', exportSession);
    importBtn.addEventListener('click', importSession);
});
