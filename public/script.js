// ============================================================
// SMART WATERING - script.js
// Polling setiap 1 detik, update DOM langsung (tanpa reload)
// ============================================================

const POLL_INTERVAL = 1000; // ms

// -- State terakhir
let currentState = {
  online: false,
  mode: 0,     // 0 = auto, 1 = manual
  relay: 0,    // 0 = off, 1 = on
  siramActive: false,
};

// ============================================================
// DOM REFERENCES
// ============================================================
const statusPill   = document.getElementById('statusPill');
const statusText   = document.getElementById('statusText');
const offlineOverlay = document.getElementById('offlineOverlay');

const valTemp   = document.getElementById('valTemp');
const valHumid  = document.getElementById('valHumid');
const valSoil   = document.getElementById('valSoil');
const barTemp   = document.getElementById('barTemp');
const barHumid  = document.getElementById('barHumid');
const barSoil   = document.getElementById('barSoil');

const gaugeFill = document.getElementById('gaugeFill');
const gaugeText = document.getElementById('gaugeText');

const btnAuto   = document.getElementById('btnAuto');
const btnManual = document.getElementById('btnManual');
const cardSiram = document.getElementById('cardSiram');
const btnSiram  = document.getElementById('btnSiram');
const siramIcon = document.getElementById('siramIcon');
const siramLabel= document.getElementById('siramLabel');

const ledBlue   = document.getElementById('ledBlue');
const ledGreen  = document.getElementById('ledGreen');
const ledRelay  = document.getElementById('ledRelay');

// ============================================================
// GAUGE HELPER
// Arc panjang total = 157 (setengah lingkaran, r=50)
// ============================================================
const GAUGE_TOTAL = 157;

// ============================================================
// HELPER: SAFE NUMERIC VALUE PARSER
// ============================================================
function getNumericValue(val, fallback = 0) {
  if (val === null || val === undefined) return fallback;
  const num = Number(val);
  return isNaN(num) ? fallback : num;
}

function setGauge(percent) {
  const p = getNumericValue(percent, 0);
  const constrained = Math.max(0, Math.min(100, p));
  const offset = GAUGE_TOTAL - (constrained / 100) * GAUGE_TOTAL;
  gaugeFill.style.strokeDashoffset = offset;

  // Warna berdasarkan level
  if (constrained < 20)      gaugeFill.style.stroke = '#d94040';
  else if (constrained < 50) gaugeFill.style.stroke = '#e8a020';
  else                       gaugeFill.style.stroke = '#2d7fc1';

  gaugeText.textContent = constrained.toFixed(0) + '%';
}

// ============================================================
// UPDATE UI DARI DATA STATUS
// ============================================================
function updateUI(data) {
  // --- Online status
  statusPill.classList.toggle('online', true);
  statusPill.classList.remove('offline');
  statusText.textContent = 'Online';
  offlineOverlay.style.display = 'none';

  // --- Metric cards
  const temp  = getNumericValue(data.temperature, 0);
  const humid = getNumericValue(data.humidity, 0);
  const soil  = getNumericValue(data.soil, 0);

  valTemp.textContent  = temp.toFixed(1);
  valHumid.textContent = humid.toFixed(0);
  valSoil.textContent  = soil.toFixed(0);

  barTemp.style.width  = Math.min(100, (temp / 50) * 100) + '%';
  barHumid.style.width = Math.min(100, humid) + '%';
  barSoil.style.width  = Math.min(100, soil) + '%';

  // Warna nilai suhu
  valTemp.style.color = temp >= 35 ? '#d94040' : temp >= 28 ? '#e8a020' : '';

  // --- Gauge tank
  setGauge(data.tank);

  // --- Mode toggle
  const isManual = data.mode === 1;
  btnAuto.classList.toggle('active', !isManual);
  btnManual.classList.toggle('active', isManual);

  // Sembunyikan tombol siram jika mode auto
  cardSiram.style.display = isManual ? 'flex' : 'none';

  // --- LED indicators
  ledBlue.classList.toggle('on',  data.blue  === 1);
  ledGreen.classList.toggle('on', data.green === 1);
  ledRelay.classList.toggle('on', data.relay === 1);

  // --- Siram button state (sinkron dari relay)
  const pumping = data.relay === 1;
  btnSiram.classList.toggle('pumping', pumping);
  siramIcon.textContent  = pumping ? '🚿' : '💧';
  siramLabel.textContent = pumping ? 'HENTIKAN' : 'SIRAM';

  // Simpan state
  currentState.mode  = data.mode;
  currentState.relay = data.relay;
  currentState.online = true;
}

function setOffline() {
  statusPill.classList.remove('online');
  statusPill.classList.add('offline');
  statusText.textContent = 'Offline';
  offlineOverlay.style.display = 'flex';
  currentState.online = false;
}

// ============================================================
// POLLING STATUS
// ============================================================
async function fetchStatus() {
  try {
    const res = await fetch('/api/status', {
      cache: 'no-store',
      signal: AbortSignal.timeout(4000), // timeout 4 detik
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
// SET MODE (auto / manual)
// ============================================================
async function setMode(modeVal) {
  // Optimistic UI update langsung
  const isManual = modeVal === 1;
  btnAuto.classList.toggle('active', !isManual);
  btnManual.classList.toggle('active', isManual);
  cardSiram.style.display = isManual ? 'flex' : 'none';

  try {
    await fetch('/api/mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: modeVal }),
      signal: AbortSignal.timeout(4000),
    });
  } catch {
    // Gagal kirim, polling berikutnya akan koreksi UI
    console.warn('Gagal set mode');
  }
}

// ============================================================
// TOGGLE SIRAM MANUAL
// ============================================================
let siramBusy = false;

async function toggleSiram() {
  if (siramBusy || !currentState.online) return;
  siramBusy = true;
  btnSiram.disabled = true;

  // Toggle state pompa
  const newState = currentState.relay === 1 ? 0 : 1;

  // Optimistic UI
  const pumping = newState === 1;
  btnSiram.classList.toggle('pumping', pumping);
  siramIcon.textContent  = pumping ? '🚿' : '💧';
  siramLabel.textContent = pumping ? 'HENTIKAN' : 'SIRAM';

  try {
    await fetch('/api/siram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: newState }),
      signal: AbortSignal.timeout(4000),
    });
    currentState.relay = newState;
  } catch {
    // Kembalikan UI kalau gagal
    btnSiram.classList.toggle('pumping', !pumping);
    siramIcon.textContent  = pumping ? '💧' : '🚿';
    siramLabel.textContent = pumping ? 'SIRAM' : 'HENTIKAN';
    console.warn('Gagal toggle siram');
  } finally {
    btnSiram.disabled = false;
    siramBusy = false;
  }
}

// ============================================================
// START POLLING
// ============================================================
fetchStatus(); // fetch langsung saat load

setInterval(fetchStatus, POLL_INTERVAL);