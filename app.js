// ---------- 1️⃣ Set up AudioContext ----------
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let sourceNode;          // the node that plays the buffer
let trackBuffer;         // decoded PCM data

// ---------- 2️⃣ UI elements ----------
const fileInput   = document.getElementById('fileInput');
const playBtn     = document.getElementById('playBtn');
const pauseBtn    = document.getElementById('pauseBtn');
const stopBtn     = document.getElementById('stopBtn');
const volumeSlider= document.getElementById('volume');
const progressBar = document.getElementById('progress');
const timeInfo    = document.getElementById('timeInfo');

let gainNode = audioCtx.createGain();
gainNode.gain.value = volumeSlider.value;
gainNode.connect(audioCtx.destination);

let startTime = 0;   // when the track started playing
let pauseOffset = 0;

// ---------- 3️⃣ Load a file ----------
fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const arrayBuffer = await file.arrayBuffer();
    try {
        trackBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        console.log(`Loaded ${trackBuffer.duration.toFixed(1)}s`);
        resetPlayer();          // prepare for a fresh play
    } catch (err) {
        alert('Error decoding audio: ' + err.message);
    }
});

// ---------- 4️⃣ Playback controls ----------
function playTrack() {
    if (!trackBuffer) return;
    sourceNode = audioCtx.createBufferSource();
    sourceNode.buffer = trackBuffer;
    sourceNode.connect(gainNode);

    // If we paused before, resume from that point
    const offset = pauseOffset % trackBuffer.duration;
    startTime = audioCtx.currentTime - offset;

    sourceNode.start(0, offset);
    requestAnimationFrame(updateProgress);   // kick off UI updates
}

function pauseTrack() {
    if (!sourceNode) return;
    sourceNode.stop();
    pauseOffset = audioCtx.currentTime - startTime;
}

function stopTrack() {
    if (sourceNode) {
        sourceNode.stop();
        sourceNode.disconnect();
    }
    pauseOffset = 0;
    progressBar.value = 0;
    timeInfo.textContent = '00:00 / ' + formatTime(trackBuffer.duration);
}

// ---------- 5️⃣ UI event listeners ----------
playBtn.addEventListener('click', playTrack);
pauseBtn.addEventListener('click', pauseTrack);
stopBtn.addEventListener('click', stopTrack);

volumeSlider.addEventListener('input', () => {
    gainNode.gain.value = volumeSlider.value;
});

// ---------- 6️⃣ Progress / Time display ----------
function updateProgress() {
    if (!sourceNode) return;

    const elapsed = audioCtx.currentTime - startTime;
    if (elapsed >= trackBuffer.duration) {
        stopTrack();
        return;
    }

    progressBar.value = (elapsed / trackBuffer.duration) * 100;
    timeInfo.textContent = `${formatTime(elapsed)} / ${formatTime(trackBuffer.duration)}`;

    requestAnimationFrame(updateProgress);
}

function formatTime(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

// ---------- 7️⃣ Reset for a new track ----------
function resetPlayer() {
    stopTrack();
    playBtn.disabled = false;
}
