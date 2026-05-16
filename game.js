/**
 * FitQuest: Core Exercise Engine (game.js)
 * Mengurus perkakasan pengesanan gerakan fizikal dan simulasi pertempuran Slime King.
 */

let shakeCount = 0;
let lastX = null, lastY = null, lastZ = null;
const SHAKE_THRESHOLD = 15; // Keberkesanan daya hayunan untuk kesan pergerakan senaman

let heroHP = 100;
let bossHP = 100;
let gameTimerInterval = null;
let secondsElapsed = 0;

/**
 * Dipanggil secara automatik oleh app.js sebaik sahaja pemain memasuki perlawanan
 */
function initializeGameEngine() {
  // Tetapkan semula pembolehubah (Reset state)
  shakeCount = 0;
  heroHP = 100;
  bossHP = 100;
  secondsElapsed = 0;
  
  document.getElementById('p-fill').style.width = "100%";
  document.getElementById('e-fill').style.width = "100%";
  document.getElementById('status-msg').textContent = "Sila mulakan senaman hayunan telefon!";
  document.getElementById('motion-display').textContent = "Goyangan Dikesan: 0 | Status: Bertempur";

  // Jalankan pengesanan sensor fizikal telefon
  window.addEventListener('devicemotion', handleDeviceMotionTracking);

  // Jalankan jangka masa perlawanan (Game Loop Clock)
  gameTimerInterval = setInterval(() => {
    secondsElapsed++;
    
    // Simulasi Boss menyerang pemain sekali-sekala
    if (secondsElapsed % 3 === 0) {
      heroHP -= 8;
      if (heroHP < 0) heroHP = 0;
      document.getElementById('p-fill').style.width = `${heroHP}%`;
    }

    // Semak jika wira kecundang
    if (heroHP <= 0) {
      terminateGameSession(false);
    }
  }, 1000);

  // Hubungkan butang tamat paksa (untuk pembentangan pantas komputer riba)
  document.getElementById('btn-force-end').onclick = () => {
     terminateGameSession(true);
  };
}

/**
 * Memproses input pecutan akselerometer terus daripada sistem perkakasan telefon
 */
function handleDeviceMotionTracking(event) {
  const acc = event.accelerationIncludingGravity;
  if (!acc) return;

  if (lastX !== null && lastY !== null && lastZ !== null) {
    let deltaX = Math.abs(acc.x - lastX);
    let deltaY = Math.abs(acc.y - lastY);
    let deltaZ = Math.abs(acc.z - lastZ);

    // Jika pecutan melebihi tahap sensitiviti, dikira sebagai 1 pergerakan senaman
    if ((deltaX > SHAKE_THRESHOLD && deltaY > SHAKE_THRESHOLD) || deltaZ > SHAKE_THRESHOLD) {
      shakeCount++;
      document.getElementById('motion-display').textContent = `Goyangan Dikesan: ${shakeCount} | Status: Aktif`;
      
      // Berikan kecederaan (Damage) kepada Slime King Boss bagi setiap senaman
      bossHP -= 4;
      if (bossHP < 0) bossHP = 0;
      document.getElementById('e-fill').style.width = `${bossHP}%`;
      
      document.getElementById('status-msg').textContent = "💥 Serangan fizikal dikesan! Boss cedera!";

      // Semak jika kemenangan dicapai
      if (bossHP <= 0) {
        terminateGameSession(true);
      }
    }
  }

  lastX = acc.x;
  lastY = acc.y;
  lastZ = acc.z;
}

/**
 * Menamatkan sesi senaman dan merangkumkan pencapaian untuk dihantar ke app.js
 */
function terminateGameSession(isVictory) {
  // Matikan semua pengesan event dan clock untuk elak pembaziran memori telefon
  window.removeEventListener('devicemotion', handleDeviceMotionTracking);
  clearInterval(gameTimerInterval);

  // Formula matematik mudah untuk pengiraan statistik kecergasan FYP anda
  const calculatedCalories = Math.round(shakeCount * 0.15); // Andaian 1 goyangan = 0.15 kcal
  const calculatedXP = isVictory ? (50 + shakeCount) : (10 + shakeCount);
  const minutesUsed = parseFloat((secondsElapsed / 60).toFixed(2)) || 0.1;

  // Hantar data ringkasan ke pengawal app.js
  if (typeof window.onGameSessionComplete === 'function') {
    window.onGameSessionComplete({
      victory: isVictory,
      calories: calculatedCalories,
      duration: minutesUsed,
      xpGained: calculatedXP
    });
  }
}
