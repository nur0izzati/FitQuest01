// Example structural mapping inside app.js 

// When clicking "START PHYSICAL GAME"
document.getElementById('btn-start-flow').addEventListener('click', () => {
  document.getElementById('screen-dashboard').classList.add('hidden');
  document.getElementById('screen-calibration').classList.remove('hidden');
  // Trigger sensor setup functions here...
});

// When backing out from Calibration window
document.getElementById('btn-abort-cal').addEventListener('click', () => {
  document.getElementById('screen-calibration').classList.add('hidden');
  document.getElementById('screen-dashboard').classList.remove('hidden');
});

// When moving from Calibration into the Game container
document.getElementById('btn-ignite-game').addEventListener('click', () => {
  document.getElementById('screen-calibration').classList.add('hidden');
  document.getElementById('game-container').classList.remove('hidden');
  // Call game launch logic here...
});
