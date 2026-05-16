/**
 * FitQuest: Master Control Shell (app.js)
 * Mengurus penukaran skrin (SPA), Firebase Auth, Local Guest Session, dan integrasi data sensor.
 */

// --- GLOBAL VARIABLES & STATE MANAGEMENT ---
let isGuestMode = false;
let currentUser = null;
let appState = {
  activeScreen: 'screen-auth',
  streakCount: 0,
  cumulativeXP: 0
};

// Mula sistem sebaik sahaja fail HTML siap dimuat naik
document.addEventListener("DOMContentLoaded", () => {
  // --- INITIALIZATION ENTRY POINT (Sila kemas kini bahagian ini dalam app.js) ---
document.addEventListener("DOMContentLoaded", () => {
    setupSPAViewRouter();
    verifyHardwareAPI();
    
    // === TAMBAH KOD DAFTAR SERVICE WORKER DI SINI ===
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./service-worker.js')
        .then((registration) => {
          console.log('Pendaftaran PWA Service Worker Berjaya! Scope:', registration.scope);
        })
        .catch((error) => {
          console.error('Pendaftaran PWA Service Worker Gagal:', error);
        });
    }
    // ================================================
  
    // Expose lifecycle hook callback for game.js to return session statistics
    window.onGameSessionComplete = handleEngineSessionPayload;
  });

function navigateToView(nextScreenId) {
  const currentView = document.getElementById(appState.activeScreen);
  const targetView = document.getElementById(nextScreenId);

  if (currentView) currentView.classList.add('hidden');
  if (targetView) {
    targetView.classList.remove('hidden');
    appState.activeScreen = nextScreenId;
  }
}

function setupSPAViewRouter() {
  // Hubungkan semua butang navigasi UI
  document.getElementById('btn-login').addEventListener('click', executeFirebaseLogin);
  document.getElementById('btn-register').addEventListener('click', executeFirebaseRegistration);
  document.getElementById('btn-guest').addEventListener('click', executeLocalGuestLogin);
  document.getElementById('btn-logout').addEventListener('click', executeSignOut);

  document.getElementById('btn-start-flow').addEventListener('click', () => {
    navigateToView('screen-calibration');
    igniteSensorCalibrationCheck();
  });

  document.getElementById('btn-abort-cal').addEventListener('click', () => {
    navigateToView('screen-dashboard');
  });
  
  document.getElementById('btn-ignite-game').addEventListener('click', () => {
    navigateToView('game-container');
    // Jalankan sistem permulaan game di dalam game.js
    if (typeof initializeGameEngine === 'function') {
      initializeGameEngine();
    }
  });
}

// --- LOGIK MOD TETAMU LOKAL (WITHOUT LOGIN) ---
function executeLocalGuestLogin() {
  isGuestMode = true;
  currentUser = null;
  
  // Ambil data yang tersimpan lama dalam memori browser (jika ada)
  appState.cumulativeXP = parseInt(localStorage.getItem('fitquest_guest_xp')) || 0;
  appState.streakCount = parseInt(localStorage.getItem('fitquest_guest_streak')) || 0;
  
  document.getElementById('auth-error').textContent = "";
  document.getElementById('user-display-tag').textContent = "Tetamu (Lokal)";
  
  // Kemas kini paparan dashboard
  document.getElementById('dash-xp').textContent = `${appState.cumulativeXP} XP`;
  document.getElementById('dash-streak').textContent = `${appState.streakCount} HARI`;
  
  navigateToView('screen-dashboard');
}

// --- LOGIK INTEGRASI FIREBASE DATABASE ---
function executeFirebaseLogin() {
  if (typeof firebase === 'undefined' || !firebase.apps.length) {
    document.getElementById('auth-error').textContent = "Firebase belum dikonfigurasikan dengan betul. Sila gunakan Mod Tetamu.";
    return;
  }

  const email = document.getElementById('auth-email').value.trim();
  const pass = document.getElementById('auth-pass').value;
  const feedback = document.getElementById('auth-error');

  if (!email || !pass) { return feedback.textContent = "Sila isi semua ruangan!"; }
  feedback.textContent = "Menghubungkan ke server...";
  
  firebase.auth().signInWithEmailAndPassword(email, pass)
    .then((userCredential) => {
      feedback.textContent = "";
      isGuestMode = false;
      synchronizeUserDataProfile(userCredential.user);
    })
    .catch((error) => { feedback.textContent = `Ralat: ${error.message}`; });
}

function executeFirebaseRegistration() {
  if (typeof firebase === 'undefined' || !firebase.apps.length) {
    document.getElementById('auth-error').textContent = "Firebase belum dikonfigurasikan. Sila gunakan Mod Tetamu.";
    return;
  }

  const email = document.getElementById('auth-email').value.trim();
  const pass = document.getElementById('auth-pass').value;
  const feedback = document.getElementById('auth-error');

  if (!email || !pass) { return feedback.textContent = "Sila isi semua ruangan!"; }
  feedback.textContent = "Mendaftar akaun baru...";

  firebase.auth().createUserWithEmailAndPassword(email, pass)
    .then((userCredential) => {
      const uid = userCredential.user.uid;
      firebase.firestore().collection("users").doc(uid).set({
        email: email,
        cumulativeXP: 0,
        streakCount: 0,
        createdTimestamp: firebase.firestore.FieldValue.serverTimestamp()
      }).then(() => {
        feedback.textContent = "";
        isGuestMode = false;
        synchronizeUserDataProfile(userCredential.user);
      });
    })
    .catch((error) => { feedback.textContent = `Ralat: ${error.message}`; });
}

function synchronizeUserDataProfile(user) {
  currentUser = user;
  document.getElementById('user-display-tag').textContent = user.email.split('@')[0];

  firebase.firestore().collection("users").doc(user.uid).get().then((doc) => {
    if (doc.exists) {
      const data = doc.data();
      appState.cumulativeXP = data.cumulativeXP || 0;
      appState.streakCount = data.streakCount || 0;
      
      document.getElementById('dash-xp').textContent = `${appState.cumulativeXP} XP`;
      document.getElementById('dash-streak').textContent = `${appState.streakCount} HARI`;
    }
    navigateToView('screen-dashboard');
  }).catch(() => { navigateToView('screen-dashboard'); });
}

function executeSignOut() {
  if (!isGuestMode && typeof firebase !== 'undefined' && firebase.apps.length) {
    firebase.auth().signOut();
  }
  isGuestMode = false;
  currentUser = null;
  document.getElementById('auth-email').value = "";
  document.getElementById('auth-pass').value = "";
  navigateToView('screen-auth');
}

// --- SISTEM PEMERIKSAAN HARDWARE GERAKAN ---
function verifyHardwareAPI() {
  if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
    document.getElementById('safari-permission-notice').style.display = 'block';
  }
}

function igniteSensorCalibrationCheck() {
  const xIndicator = document.getElementById('cal-x');
  const yIndicator = document.getElementById('cal-y');
  const zIndicator = document.getElementById('cal-z');
  const launchBtn = document.getElementById('btn-ignite-game');

  launchBtn.disabled = true;
  launchBtn.style.opacity = "0.4";

  function parseCalibrationStream(event) {
    const acc = event.accelerationIncludingGravity;
    if (!acc) return;

    xIndicator.innerHTML = `Sumbu X: <span class="good">${(acc.x || 0).toFixed(2)} m/s²</span>`;
    yIndicator.innerHTML = `Sumbu Y: <span class="good">${(acc.y || 0).toFixed(2)} m/s²</span>`;
    zIndicator.innerHTML = `Sumbu Z: <span class="good">${(acc.z || 0).toFixed(2)} m/s²</span>`;

    window.removeEventListener('devicemotion', parseCalibrationStream);
    launchBtn.disabled = false;
    launchBtn.style.opacity = "1";
    document.getElementById('cal-status-text').textContent = "✅ Peranti Disahkan Berfungsi!";
  }

  if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
    DeviceMotionEvent.requestPermission()
      .then(state => {
        if (state === 'granted') { window.addEventListener('devicemotion', parseCalibrationStream); }
        else { document.getElementById('cal-status-text').textContent = "❌ Akses Sensor Disekat!"; }
      }).catch(err => console.error(err));
  } else {
    window.addEventListener('devicemotion', parseCalibrationStream);
    // Buka akses terus jika dibuka di komputer riba semasa pembangunan (development testing)
    setTimeout(() => { launchBtn.disabled = false; launchBtn.style.opacity = "1"; }, 1000);
  }
}

// --- PENERIMAAN DATA SELESAI GAMEPLAY ---
function handleEngineSessionPayload(dataSummary) {
  appState.cumulativeXP += dataSummary.xpGained;
  if(dataSummary.victory) { appState.streakCount += 1; }

  // 1. Kemas kini paparan UI Ringkasan Rekod
  document.getElementById('summary-calories').textContent = `${dataSummary.calories} kcal`;
  document.getElementById('summary-time').textContent = `${dataSummary.duration} min`;
  document.getElementById('summary-outcome').textContent = dataSummary.victory ? "MENANG 🎉" : "TEWAS 💔";
  document.getElementById('summary-outcome').style.color = dataSummary.victory ? "var(--success)" : "var(--danger)";
  document.getElementById('analytics-box').style.display = 'block';

  document.getElementById('dash-xp').textContent = `${appState.cumulativeXP} XP`;
  document.getElementById('dash-streak').textContent = `${appState.streakCount} HARI`;

  // 2. Simpan mengikut mod pilihan pengguna
  if (isGuestMode) {
    localStorage.setItem('fitquest_guest_xp', appState.cumulativeXP);
    localStorage.setItem('fitquest_guest_streak', appState.streakCount);
  } else if (currentUser) {
    firebase.firestore().collection("users").doc(currentUser.uid).update({
      cumulativeXP: appState.cumulativeXP,
      streakCount: appState.streakCount
    }).catch(err => console.error("Ralat simpan awan:", err));
  }

  navigateToView('screen-dashboard');
}
