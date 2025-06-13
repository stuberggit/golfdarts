let players = [];
let currentHole = 1;

function startGame() {
  const count = parseInt(document.getElementById("playerCount").value);
  if (count < 1 || count > 20) return alert("Enter 1 to 20 players.");
  
  players = Array.from({ length: count }, (_, i) => ({ name: `Player ${i + 1}`, scores: [] }));
  document.getElementById("setup").style.display = "none";
  document.getElementById("game").style.display = "block";
  showHole();
}

function showHole() {
  document.getElementById("holeHeader").innerText = `Hole ${currentHole}`;
  const container = document.getElementById("scoreInputs");
  container.innerHTML = "";

  players.forEach((player, idx) => {
    const label = document.createElement("label");
    label.innerHTML = `${player.name} hits: <input type="number" id="hits-${idx}" min="0" max="9" value="0"><br>`;
    container.appendChild(label);
  });
}

function nextHole() {
  players.forEach((player, idx) => {
    const hits = parseInt(document.getElementById(`hits-${idx}`).value);
    player.scores.push(getScore(hits));
  });

  if (currentHole < 18) {
    currentHole++;
    showHole();
  } else {
    showFinalScores();
  }
}

function getScore(hits) {
  const scores = [3, 2, 1, 0, -1, -2, -3, -4, -5];
  return hits >= 1 && hits <= 9 ? scores[hits - 1] : 0;
}

function showFinalScores() {
  document.getElementById("game").style.display = "none";
  const resultDiv = document.getElementById("finalScore");
  let html = "<h2>🏆 Final Scores</h2><ul>";

  players.forEach(player => {
    const total = player.scores.reduce((a, b) => a + b, 0);
    html += `<li>${player.name}: ${total}</li>`;
  });

  html += "</ul>";
  resultDiv.innerHTML = html;
}

