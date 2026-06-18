// ============================================================
// SMART WATERING - script.js
// Polling setiap 1 detik, update DOM langsung (tanpa reload)
// Tombol siram: hold to water (tahan = nyala, lepas = mati)
// ============================================================

const POLL_INTERVAL = 1000; // ms

let currentState = {
  online: false,
  mode: 0,
  relay: 0,
};

let targetState = {
  mode: null,
  relay: null,
};

let modeTimeout  = null;
let relayTimeout = null;

// ============================================================
// DOM REFERENCES
// ============================================================
const statusPill     = document.getElementById('statusPill');
const statusText     = document.getElementById('statusText');
const offlineOverlay = document.getElementById('offlineOverlay');
const header         = document.querySelector('header');

const valTemp  = document.getElementById('valTemp');
const valHumid = document.getElementById('valHumid');
const valSoil  = document.getElementById('valSoil');
const barTemp  = document.getElementById('barTemp');
const barHumid = document.getElementById('barHumid');
const barSoil  = document.getElementById('barSoil');

const gaugeFill = document.getElementById('gaugeFill');
const gaugeText = document.getElementById('gaugeText');

const btnAuto   = document.getElementById('btnAuto');
const btnManual = document.getElementById('btnManual');
const cardSiram = document.getElementById('cardSiram');
const btnSiram  = document.getElementById('btnSiram');
const siramIcon = document.getElementById('siramIcon');
const siramLabel= document.getElementById('siramLabel');

const ledBlue  = document.getElementById('ledBlue');
const ledGreen = document.getElementById('ledGreen');

// ============================================================
// HELPERS
// ============================================================
const GAUGE_TOTAL = 157;

function safeNum(val, fallback = 0) {
  const n = Number(val);
  return isNaN(n) ? fallback : n;
}

function setGauge(percent) {
  const p = Math.max(0, Math.min(100, safeNum(percent)));
  gaugeFill.style.strokeDashoffset = GAUGE_TOTAL - (p / 100) * GAUGE_TOTAL;
  gaugeFill.style.stroke = p < 20 ? '#d94040' : p < 50 ? '#e8a020' : '#2d7fc1';
  gaugeText.textContent  = p.toFixed(0) + '%';
}

// ============================================================
// UPDATE UI
// ============================================================
function updateUI(data) {
  const isWatering = data.relay === 1 || data.blue === 1;

  // Header & status pill
  header.classList.toggle('watering', isWatering);
  statusPill.classList.toggle('online',   !isWatering);
  statusPill.classList.toggle('watering',  isWatering);
  statusPill.classList.remove('offline');
  statusText.textContent = isWatering ? 'Menyiram' : 'Online';
  offlineOverlay.style.display = 'none';

  // Metrics
  const temp  = safeNum(data.temperature);
  const humid = safeNum(data.humidity);
  const soil  = safeNum(data.soil);

  valTemp.textContent  = temp.toFixed(1);
  valHumid.textContent = humid.toFixed(0);
  valSoil.textContent  = soil.toFixed(0);

  barTemp.style.width  = Math.min(100, (temp / 50) * 100) + '%';
  barHumid.style.width = Math.min(100, humid) + '%';
  barSoil.style.width  = Math.min(100, soil) + '%';
  valTemp.style.color  = temp >= 35 ? '#d94040' : temp >= 28 ? '#e8a020' : '';

  // Tank gauge
  const tankVal = safeNum(data.tank);
  setGauge(tankVal);

  // Low water alert
  const waterAlert = document.getElementById('waterAlert');
  if (waterAlert) waterAlert.style.display = tankVal < 15 ? 'block' : 'none';

  // Mode toggle — hanya update kalau tidak ada pending target
  if (targetState.mode === null) {
    const isManual = data.mode === 1;
    btnAuto.classList.toggle('active', !isManual);
    btnManual.classList.toggle('active', isManual);

    // Tampilkan tombol siram hanya saat mode manual
    if (cardSiram) cardSiram.style.display = isManual ? 'flex' : 'none';
    currentState.mode = data.mode;
  } else if (data.mode === targetState.mode) {
    // Konfirmasi dari device sudah sinkron
    clearTimeout(modeTimeout);
    targetState.mode = null;
    btnAuto.disabled = btnManual.disabled = false;
    currentState.mode = data.mode;

    const isManual = data.mode === 1;
    btnAuto.classList.toggle('active', !isManual);
    btnManual.classList.toggle('active', isManual);
    if (cardSiram) cardSiram.style.display = isManual ? 'flex' : 'none';
  }

  // LED indicators
  ledBlue.classList.toggle('on',  data.blue  === 1);
  ledGreen.classList.toggle('on', data.green === 1);

  // Relay — update hanya kalau tidak ada pending target
  if (targetState.relay === null) {
    currentState.relay = data.relay;
    updateSiramButton(data.relay === 1);
  } else if (data.relay === targetState.relay) {
    clearTimeout(relayTimeout);
    targetState.relay = null;
    currentState.relay = data.relay;
  }

  currentState.online = true;
}

// Update visual tombol siram tanpa mengubah disabled state
function updateSiramButton(pumping) {
  btnSiram.classList.toggle('pumping', pumping);
  siramIcon.textContent  = pumping ? '🚿' : '💧';
  siramLabel.textContent = pumping ? 'SEDANG MENYIRAM...' : 'TAHAN UNTUK MENYIRAM';
}

function setOffline() {
  statusPill.classList.remove('online', 'watering');
  statusPill.classList.add('offline');
  statusText.textContent = 'Offline';
  offlineOverlay.style.display = 'flex';
  currentState.online = false;
}

// ============================================================
// POLLING
// ============================================================
async function fetchStatus() {
  try {
    const res = await fetch('/api/status', {
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (!data.online) throw new Error('device offline');
    updateUI(data);
  } catch {
    setOffline();
  }
}

// ============================================================
// SET MODE
// ============================================================
async function setMode(modeVal) {
  if (!currentState.online) return;
  if (modeTimeout) clearTimeout(modeTimeout);

  targetState.mode = modeVal;
  btnAuto.disabled = btnManual.disabled = true;

  const isManual = modeVal === 1;
  btnAuto.classList.toggle('active', !isManual);
  btnManual.classList.toggle('active', isManual);
  if (cardSiram) cardSiram.style.display = isManual ? 'flex' : 'none';

  modeTimeout = setTimeout(() => {
    targetState.mode = null;
    btnAuto.disabled = btnManual.disabled = false;
    const wasManual = currentState.mode === 1;
    btnAuto.classList.toggle('active', !wasManual);
    btnManual.classList.toggle('active', wasManual);
    console.warn('Mode sync timeout — reverted');
  }, 8000);

  try {
    const res = await fetch('/api/mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: modeVal }),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
  } catch (err) {
    clearTimeout(modeTimeout);
    targetState.mode = null;
    btnAuto.disabled = btnManual.disabled = false;
    const wasManual = currentState.mode === 1;
    btnAuto.classList.toggle('active', !wasManual);
    btnManual.classList.toggle('active', wasManual);
    if (cardSiram) cardSiram.style.display = wasManual ? 'flex' : 'none';
    console.warn('Gagal set mode:', err);
  }
}

// ============================================================
// HOLD-TO-WATER
// Kirim nyala saat press, kirim mati saat release
// ============================================================
let holdActive = false; // mencegah double-trigger touch + mouse

async function sendRelay(state) {
  targetState.relay = state;
  if (relayTimeout) clearTimeout(relayTimeout);

  // Optimistic UI langsung
  updateSiramButton(state === 1);

  // Safety timeout: kalau device tidak konfirmasi dalam 8 detik, revert
  relayTimeout = setTimeout(() => {
    targetState.relay = null;
    updateSiramButton(currentState.relay === 1);
    console.warn('Relay sync timeout — reverted');
  }, 8000);

  try {
    const res = await fetch('/api/siram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state }),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
  } catch (err) {
    clearTimeout(relayTimeout);
    targetState.relay = null;
    updateSiramButton(currentState.relay === 1);
    console.warn('Gagal set relay:', err);
  }
}

function onSiramPress(e) {
  e.preventDefault(); // cegah scroll saat touch
  if (!currentState.online || holdActive) return;
  if (currentState.mode !== 1) return; // hanya di mode manual
  holdActive = true;
  sendRelay(1);
}

function onSiramRelease(e) {
  e.preventDefault();
  if (!holdActive) return;
  holdActive = false;
  sendRelay(0);
}

// Touch events (mobile)
btnSiram.addEventListener('touchstart',  onSiramPress,   { passive: false });
btnSiram.addEventListener('touchend',    onSiramRelease, { passive: false });
btnSiram.addEventListener('touchcancel', onSiramRelease, { passive: false });

// Mouse events (desktop)
btnSiram.addEventListener('mousedown', onSiramPress);
btnSiram.addEventListener('mouseup',   onSiramRelease);

// Kalau kursor keluar tombol saat masih ditekan — stop juga
btnSiram.addEventListener('mouseleave', (e) => {
  if (holdActive) onSiramRelease(e);
});

// Cegah context menu saat long-press di mobile
btnSiram.addEventListener('contextmenu', (e) => e.preventDefault());

// ============================================================
// START
// ============================================================
fetchStatus();
setInterval(fetchStatus, POLL_INTERVAL);