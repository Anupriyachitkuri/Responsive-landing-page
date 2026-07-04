/**
 * AetherStop Pro - Precision Stopwatch Script
 */

// SVG Icon templates
const ICONS = {
    play: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
    pause: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/></svg>`,
    flag: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>`,
    reset: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>`
};

// Constant for Progress Circle SVG
const CIRCUMFERENCE = 741.4; // 2 * Math.PI * 118

// Audio Synthesizer Engine
let audioCtx = null;
function playClickSound(frequency = 1200, duration = 0.04) {
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
        
        gainNode.gain.setValueAtTime(0.06, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + duration);
    } catch (err) {
        console.warn("Web Audio is not supported or was blocked: ", err);
    }
}

// State Variables
let stopwatchState = 'idle'; // 'idle', 'running', 'paused'
let startTime = null;        // Unix timestamp (Date.now())
let accumulatedTime = 0;     // milliseconds
let animationFrameId = null;

// Laps Registry
let laps = []; // Array of { id, splitTime, totalTime }
let lastLapTotalTime = 0;

// DOM Elements
const cardElement = document.querySelector('.stopwatch-card');
const timeMainEl = document.getElementById('time-main');
const timeMsEl = document.getElementById('time-ms');
const progressRing = document.getElementById('progress-ring');

const btnLeft = document.getElementById('btn-left');
const btnLeftText = document.getElementById('btn-left-text');
const btnLeftIcon = btnLeft.querySelector('.btn-icon');

const btnRight = document.getElementById('btn-right');
const btnRightText = document.getElementById('btn-right-text');
const btnRightIcon = btnRight.querySelector('.btn-icon');

// Lap Export Elements
const lapCountEl = document.getElementById('lap-count');
const emptyStateEl = document.getElementById('empty-state');
const tableWrapperEl = document.getElementById('table-wrapper');
const lapsListEl = document.getElementById('laps-list');
const btnExportCsv = document.getElementById('btn-export-csv');
const btnExportCopy = document.getElementById('btn-export-copy');

/* ==========================================================================
   Timing Functions
   ========================================================================== */

/**
 * Format milliseconds into HH:MM:SS and Centiseconds (.CS)
 */
function formatTime(msTotal) {
    if (msTotal < 0) msTotal = 0;
    
    const hours = Math.floor(msTotal / 3600000);
    const minutes = Math.floor((msTotal % 3600000) / 60000);
    const seconds = Math.floor((msTotal % 60000) / 1000);
    const centiseconds = Math.floor((msTotal % 1000) / 10);
    
    const pad = (num) => String(num).padStart(2, '0');
    
    return {
        main: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`,
        ms: `.${pad(centiseconds)}`
    };
}

/**
 * Update UI time elements and progress circle
 */
function updateDisplay(elapsed) {
    const formatted = formatTime(elapsed);
    timeMainEl.textContent = formatted.main;
    timeMsEl.textContent = formatted.ms;
    
    // Update progress circle (completes one rotation every 60 seconds)
    const seconds = (elapsed % 60000) / 1000;
    const progress = seconds / 60;
    const offset = CIRCUMFERENCE - (progress * CIRCUMFERENCE);
    progressRing.style.strokeDashoffset = offset;
}

/**
 * Main animation loop to draw timer
 */
function tick() {
    if (stopwatchState !== 'running') return;
    
    const elapsed = Date.now() - startTime + accumulatedTime;
    updateDisplay(elapsed);
    
    animationFrameId = requestAnimationFrame(tick);
}

/* ==========================================================================
   State & UI Transition Functions
   ========================================================================== */

/**
 * Transition the controls and layout classes based on state
 */
function setStopwatchState(newState) {
    stopwatchState = newState;
    
    // Clear classes
    cardElement.classList.remove('stopwatch-running', 'stopwatch-paused');
    btnLeft.classList.remove('state-lap-active', 'state-reset-active');
    btnRight.classList.remove('state-running');
    
    if (newState === 'idle') {
        btnLeft.disabled = true;
        btnLeftText.textContent = 'Lap';
        btnLeftIcon.innerHTML = ICONS.flag;
        
        btnRightText.textContent = 'Start';
        btnRightIcon.innerHTML = ICONS.play;
        
        updateDisplay(0);
    } 
    else if (newState === 'running') {
        cardElement.classList.add('stopwatch-running');
        
        btnLeft.disabled = false;
        btnLeft.classList.add('state-lap-active');
        btnLeftText.textContent = 'Lap';
        btnLeftIcon.innerHTML = ICONS.flag;
        
        btnRight.classList.add('state-running');
        btnRightText.textContent = 'Pause';
        btnRightIcon.innerHTML = ICONS.pause;
    } 
    else if (newState === 'paused') {
        cardElement.classList.add('stopwatch-paused');
        
        btnLeft.disabled = false;
        btnLeft.classList.add('state-reset-active');
        btnLeftText.textContent = 'Reset';
        btnLeftIcon.innerHTML = ICONS.reset;
        
        btnRightText.textContent = 'Resume';
        btnRightIcon.innerHTML = ICONS.play;
    }
    
    saveSession();
}

/* ==========================================================================
   Laps Logic & Rendering
   ========================================================================== */

/**
 * Record a new lap
 */
function recordLap() {
    const elapsed = Date.now() - startTime + accumulatedTime;
    const splitTime = elapsed - lastLapTotalTime;
    
    laps.unshift({
        id: laps.length + 1,
        splitTime: splitTime,
        totalTime: elapsed
    });
    
    lastLapTotalTime = elapsed;
    renderLaps();
    saveSession();
}

/**
 * Render lap items list in DOM
 */
function renderLaps() {
    const count = laps.length;
    lapCountEl.textContent = `${count} Lap${count !== 1 ? 's' : ''}`;
    
    if (count === 0) {
        emptyStateEl.style.display = 'flex';
        tableWrapperEl.style.display = 'none';
        btnExportCsv.style.display = 'none';
        btnExportCopy.style.display = 'none';
        lapsListEl.innerHTML = '';
        return;
    }
    
    emptyStateEl.style.display = 'none';
    tableWrapperEl.style.display = 'block';
    btnExportCsv.style.display = 'flex';
    btnExportCopy.style.display = 'flex';
    
    // Determine min/max splitTime for highlighting (need at least 2 laps to compare)
    let minTime = Infinity;
    let maxTime = -Infinity;
    
    if (count >= 2) {
        laps.forEach(lap => {
            if (lap.splitTime < minTime) minTime = lap.splitTime;
            if (lap.splitTime > maxTime) maxTime = lap.splitTime;
        });
    }
    
    lapsListEl.innerHTML = '';
    
    laps.forEach(lap => {
        const row = document.createElement('tr');
        
        if (count >= 2) {
            if (lap.splitTime === minTime) {
                row.className = 'lap-row-fastest';
            } else if (lap.splitTime === maxTime) {
                row.className = 'lap-row-slowest';
            }
        }
        
        const formattedSplit = formatTime(lap.splitTime);
        const formattedTotal = formatTime(lap.totalTime);
        
        row.innerHTML = `
            <td class="lap-num-cell">Lap ${lap.id}</td>
            <td class="lap-time-cell">${formattedSplit.main}${formattedSplit.ms}</td>
            <td class="lap-total-cell">${formattedTotal.main}${formattedTotal.ms}</td>
        `;
        
        lapsListEl.appendChild(row);
    });
}

/**
 * Reset all lap state variables
 */
function clearLaps() {
    laps = [];
    lastLapTotalTime = 0;
    renderLaps();
    saveSession();
}

/* ==========================================================================
   Persistence (Session Syncing)
   ========================================================================== */

/**
 * Save current timer session settings to localStorage
 */
function saveSession() {
    const session = {
        stopwatchState,
        startTime,
        accumulatedTime,
        laps,
        lastLapTotalTime
    };
    localStorage.setItem('aetherstop_session', JSON.stringify(session));
}

/**
 * Load stopwatch session state on page init
 */
function loadSession() {
    const sessionStr = localStorage.getItem('aetherstop_session');
    if (!sessionStr) return;
    
    try {
        const session = JSON.parse(sessionStr);
        
        stopwatchState = session.stopwatchState || 'idle';
        accumulatedTime = session.accumulatedTime || 0;
        laps = session.laps || [];
        lastLapTotalTime = session.lastLapTotalTime || 0;
        
        if (stopwatchState === 'running') {
            // Recalculate relative offset based on running duration passed since page unload
            startTime = session.startTime;
            
            // Start the visual ticking
            setStopwatchState('running');
            tick();
        } else if (stopwatchState === 'paused') {
            setStopwatchState('paused');
            updateDisplay(accumulatedTime);
        } else {
            setStopwatchState('idle');
        }
        
        renderLaps();
    } catch (err) {
        console.error("Failed to recover previous session: ", err);
        localStorage.removeItem('aetherstop_session');
    }
}

/* ==========================================================================
   Exports and Formatting Helpers
   ========================================================================== */

/**
 * Export laps data as download CSV
 */
function exportCSV() {
    if (laps.length === 0) return;
    playClickSound(1500, 0.06);
    
    let csvContent = "data:text/csv;charset=utf-8,Lap,Split Time,Total Time\n";
    
    // Sort laps sequentially for output CSV
    const sortedLaps = [...laps].reverse();
    sortedLaps.forEach(lap => {
        const split = formatTime(lap.splitTime);
        const total = formatTime(lap.totalTime);
        csvContent += `${lap.id},${split.main}${split.ms},${total.main}${total.ms}\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `aetherstop_laps_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Copy laps data as text block to clipboard
 */
function copyLapsText() {
    if (laps.length === 0) return;
    playClickSound(1800, 0.05);
    
    let text = "=== AETHERSTOP LAP LOG ===\n";
    const sortedLaps = [...laps].reverse();
    sortedLaps.forEach(lap => {
        const split = formatTime(lap.splitTime);
        const total = formatTime(lap.totalTime);
        text += `Lap ${lap.id} | Split: ${split.main}${split.ms} | Total: ${total.main}${total.ms}\n`;
    });
    
    navigator.clipboard.writeText(text).then(() => {
        const btnTextEl = btnExportCopy.querySelector('span');
        const originalText = btnTextEl.textContent;
        
        // Visual indicator
        btnTextEl.textContent = 'Copied!';
        btnExportCopy.style.borderColor = 'var(--success)';
        
        setTimeout(() => {
            btnTextEl.textContent = originalText;
            btnExportCopy.style.borderColor = '';
        }, 1500);
    }).catch(err => {
        console.warn("Failed to copy lap log: ", err);
    });
}

/* ==========================================================================
   Accent Theme Selector Logic
   ========================================================================== */

/**
 * Bind Theme click events
 */
function initThemeSelector() {
    const dots = document.querySelectorAll('.theme-dot');
    
    // Recover saved theme
    const savedTheme = localStorage.getItem('aetherstop_theme') || 'cyan';
    setTheme(savedTheme);
    
    dots.forEach(dot => {
        dot.addEventListener('click', () => {
            const theme = dot.getAttribute('data-theme');
            playClickSound(1000, 0.03);
            setTheme(theme);
        });
    });
}

/**
 * Update UI classes and local storage theme setting
 */
function setTheme(themeName) {
    // Clear theme classes on body
    document.body.className = '';
    document.body.classList.add(`theme-${themeName}`);
    
    // Update radio buttons checked state
    const dots = document.querySelectorAll('.theme-dot');
    dots.forEach(dot => {
        const currentTheme = dot.getAttribute('data-theme');
        if (currentTheme === themeName) {
            dot.classList.add('active');
            dot.setAttribute('aria-checked', 'true');
        } else {
            dot.classList.remove('active');
            dot.setAttribute('aria-checked', 'false');
        }
    });
    
    localStorage.setItem('aetherstop_theme', themeName);
}

/* ==========================================================================
   Action Responders
   ========================================================================== */

/**
 * Handle Primary Action click (Start / Pause / Resume)
 */
function handlePrimaryAction() {
    if (stopwatchState === 'idle' || stopwatchState === 'paused') {
        playClickSound(1200, 0.04);
        startTime = Date.now();
        setStopwatchState('running');
        tick();
    } else if (stopwatchState === 'running') {
        playClickSound(900, 0.05);
        cancelAnimationFrame(animationFrameId);
        accumulatedTime += Date.now() - startTime;
        setStopwatchState('paused');
    }
}

/**
 * Handle Secondary Action click (Lap / Reset)
 */
function handleSecondaryAction() {
    if (stopwatchState === 'running') {
        playClickSound(1100, 0.04);
        recordLap();
    } else if (stopwatchState === 'paused') {
        playClickSound(800, 0.06);
        cancelAnimationFrame(animationFrameId);
        startTime = null;
        accumulatedTime = 0;
        clearLaps();
        setStopwatchState('idle');
    }
}

/* ==========================================================================
   Event Bindings & Initialization
   ========================================================================== */

btnRight.addEventListener('click', handlePrimaryAction);
btnLeft.addEventListener('click', handleSecondaryAction);

btnExportCsv.addEventListener('click', exportCSV);
btnExportCopy.addEventListener('click', copyLapsText);

// Keyboard accessibility support
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault(); // Stop page scrolling
        handlePrimaryAction();
    }
    if (e.code === 'KeyL' && stopwatchState === 'running') {
        handleSecondaryAction();
    }
    if (e.code === 'KeyR' && stopwatchState === 'paused') {
        handleSecondaryAction();
    }
});

// App Startup
initThemeSelector();
loadSession();
if (stopwatchState === 'idle') {
    setStopwatchState('idle');
    clearLaps();
}
