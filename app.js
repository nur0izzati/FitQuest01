/**
 * FitQuest: Slime King Campaign - Master Control Shell (app.js)
 * Coordinates Single Page Application (SPA) Routing, Firebase Auth Core, 
 * Sensor Hardware Validation, and Lifecycle session data hooks.
 */

// --- GLOBAL VARIABLES & SPA MANAGEMENT ---
let currentUser = null;
let appState = {
  activeScreen: 'screen-auth',
  streakCount: 0,
  cumulativeXP: 0,
  lastSessionDuration: 0,
  lastSessionCalories: 0
};

// --- INITIALIZATION ENTRY POINT ---
document.addEventListener("DOMContentLoaded", () => {
  setupSPAViewRouter();
  verifyHardwareAPI();
  
  // Expose lifecycle hook callback for game.js to return session statistics
  window.onGameSessionComplete = handleEngineSessionPayload;
});

/**
 * Handle screen management and programmatic transitions
 * @param {string} nextScreenId - The DOM ID of the target view layer
 */
function navigateToView(nextScreenId) {
  const currentView = document.getElementById(appState.activeScreen);
  const targetView = document.getElementById(nextScreenId);

  if (currentView) currentView.classList.add('hidden');
  if (targetView) {
    targetView.classList.remove('hidden');
    appState.activeScreen = nextScreenId;
  }
}

// --- LINKING INTERFACE ROUTING ELEMENTS ---
function setupSPAViewRouter() {
  // Auth Form actions
  document.getElementById('btn-login').addEventListener('click', executeFirebaseLogin);
  document.getElementById('btn-register').addEventListener('click', executeFirebaseRegistration);
  document.getElementById('btn-logout').addEventListener('click', executeFirebaseSignOut);

  // Dashboard actions
  document.getElementById('btn-start-flow').addEventListener('click', () => {
    navigateToView('screen-calibration');
    igniteSensorCalibrationCheck();
  });

  // Calibration actions
  document.getElementById('btn-abort-cal').addEventListener('click', () => {
    navigateToView('screen-dashboard');
  });
  
  document.getElementById('btn-ignite-game').addEventListener('click', () => {
    navigateToView('game-container');
    // Call the entry initialization point compiled inside game.js
    if (typeof initializeGameEngine === 'function') {
      initializeGameEngine();
    }
  });
}

// --- FIREBASE SECURITY INTEGRATION LAYER ---
function executeFirebaseLogin() {
  const email = document.getElementById('auth-email').value.trim();
  const pass = document.getElementById('auth-pass').value;
  const feedback = document.getElementById('auth-error');

  if (!email || !pass) {
    feedback.textContent = "Sila isi semua ruangan!";
    return;
  }

  feedback.textContent = "Menghubungkan ke pelayan...";
  
  // Core Firebase Authentication Bridge
  firebase.auth().signInWithEmailAndPassword(email, pass)
    .then((userCredential) => {
      feedback.textContent = "";
      synchronizeUserDataProfile(userCredential.user);
    })
    .catch((error) => {
      feedback.textContent = `Ralat: ${error.message}`;
    });
}

function executeFirebaseRegistration() {
  const email = document.getElementById('auth-email').value.trim();
  const pass = document.getElementById('auth-pass').value;
  const feedback = document.getElementById('auth-error');

  if (!email || !pass) {
    feedback.textContent = "Sila isi semua ruangan!";
    return;
  }

  feedback.textContent = "Mendaftar akaun baharu...";

  firebase.auth().createUserWithEmailAndPassword(email, pass)
    .then((userCredential) => {
      // Create user initialization document profile in Cloud Firestore Database
      const uid = userCredential.user.uid;
      firebase.firestore().collection("users").doc(uid).set({
        email: email,
        cumulativeXP: 0,
        streakCount: 0,
        createdTimestamp: firebase.firestore.FieldValue.serverTimestamp()
      }).then(() => {
        feedback.textContent = "";
        synchronizeUserDataProfile(userCredential.user);
      });
    })
    .catch((error) => {
      feedback.textContent = `Ralat: ${error.message}`;
    });
}

function executeFirebaseSignOut() {
  firebase.auth().signOut().then(() => {
    currentUser = null;
    document.getElementById('auth-email').value = "";
    document.getElementById('auth-pass').value = "";
    navigateToView('screen-auth');
  });
}

/**
 * Sync Cloud Firestore metrics straight into current view displays
 */
function synchronizeUserDataProfile(user) {
  currentUser = user;
  document.getElementById('user-display-tag').textContent = user.email.split('@')[0];

  const docRef = firebase.firestore().collection("users").doc(user.uid);
  
  docRef.get().then((doc) => {
    if (doc.exists) {
      const data = doc.data();
      appState.cumulativeXP = data.cumulativeXP || 0;
      appState.streakCount = data.streakCount || 0;

      // Update UI panels with active profile telemetry values
      document.getElementById('dash-xp').textContent = `${appState.cumulativeXP} XP`;
      document.getElementById('dash-streak').textContent = `${appState.streakCount} HARI`;
    }
    navigateToView('screen-dashboard');
  }).catch((err) => {
    console.error("Firestore loading bottleneck: ", err);
    navigateToView('screen-dashboard'); // Fallback routing to ensure session integrity
  });
}

// --- DEVICE MOTION HARDWARE CALIBRATION ---
function verifyHardwareAPI() {
  if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
    // Reveal native permissions request triggers for strict browsers (iOS Safari / Chrome Mobile)
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

    const xVal = acc.x || 0;
    const yVal = acc.y || 0;
    const zVal = acc.z || 0;

    xIndicator.innerHTML = `Sumbu X: <span class="good">${xVal.toFixed(2)} m/s²</span>`;
    yIndicator.innerHTML = `Sumbu Y: <span class="good">${yVal.toFixed(2)} m/s²</span>`;
    zIndicator.innerHTML = `Sumbu Z: <span class="good">${zVal.toFixed(2)} m/s²</span>`;

    // Automatically enable the gameplay switch once consistent data arrays stream in
    window.removeEventListener('devicemotion', parseCalibrationStream);
    launchBtn.disabled = false;
    launchBtn.style.opacity = "1";
    document.getElementById('cal-status-text').textContent = "✅ Peranti Disahkan Berfungsi! Tekan butang di bawah.";
  }

  // Handle native mobile API requests
  if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
    DeviceMotionEvent.requestPermission()
      .then(permissionState => {
        if (permissionState === 'granted') {
          window.addEventListener('devicemotion', parseCalibrationStream);
        } else {
          document.getElementById('cal-status-text').textContent = "❌ Kebenaran Sensor Disekat! Sila benarkan akses.";
        }
      })
      .catch(err => {
        console.error(err);
      });
  } else {
    // Normal desktop fallbacks or open Android device streams
    window.addEventListener('devicemotion', parseCalibrationStream);
    // Auto unlock for development desktop test hooks
    setTimeout(() => {
      launchBtn.disabled = false;
      launchBtn.style.opacity = "1";
    }, 1200);
  }
}

// --- GAMEPLAY OVERSEER AND DATABASE SYNCING ---
/**
 * Intercepts engine state output payloads compiled at completion cycle inside game.js
 * @param {Object} dataSummary - Analytics payload map containing victory metrics
 */
function handleEngineSessionPayload(dataSummary) {
  // Save locally to display on the player dashboard summary module
  appState.lastSessionCalories = dataSummary.calories;
  appState.lastSessionDuration = dataSummary.duration;

  // Render recent session metrics container display block immediately
  document.getElementById('summary-calories').textContent = `${dataSummary.calories} kcal`;
  document.getElementById('summary-time').textContent = `${dataSummary.duration} min`;
  document.getElementById('summary-outcome').textContent = dataSummary.victory ? "MENANG 🎉" : "GAGAL 💔";
  document.getElementById('summary-outcome').style.color = dataSummary.victory ? "var(--primary)" : "var(--danger)";
  document.getElementById('analytics-box').style.display = 'block';

  // Return user focus back to the primary dashboard view panel layer
  navigateToView('screen-dashboard');

  // Push updated tracking matrices directly upstream to Firebase Server
  if (currentUser) {
    const updatedXP = appState.cumulativeXP + dataSummary.xpGained;
    
    firebase.firestore().collection("users").doc(currentUser.uid).update({
      cumulativeXP: updatedXP,
      // Increment continuous user activity streaks if a victory is secured
      streakCount: dataSummary.victory ? firebase.firestore.FieldValue.increment(1) : appState.streakCount
    }).then(() => {
      // Re-trigger visual alignment configurations to refresh totals layout variables
      const freshUserRef = firebase.auth().currentUser;
      if (freshUserRef) synchronizeUserDataProfile(freshUserRef);
    }).catch(err => console.error("Database streaming error: ", err));
  }
}
