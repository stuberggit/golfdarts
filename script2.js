let players = [];
let currentHole = 1;
let currentPlayerIndex = 0;
let gameStarted = false;

function createPlayerInputs() {
  const count = parseInt(document.getElementById("playerCount").value);
  if (isNaN(count) || count < 1 || count > 20) {
    alert("Please select the number of players.");
    return;
  }

  const playerOptions = [
    "Brandon", "Brock", "Dan", "Deanna", "Derrick", "Don", "Edgar",
    "Erin", "Mullins", "Phillip", "Pusti", "Stuberg", "Tara", "Other"
  ].sort();

  const container = document.getElementById("nameInputs");
  container.innerHTML = "";

  for (let i = 0; i < count; i++) {
    const selectId = `select-${i}`;
    const inputId = `name-${i}`;
    container.innerHTML += `
      <div class="playerInputBlock">
        <label for="${selectId}">Player ${i + 1}:</label>
        <select id="${selectId}" onchange="handleNameDropdown('${selectId}', '${inputId}')">
          <option value="" disabled selected>Select Player</option>
          ${playerOptions.map(name => `<option value="${name}">${name}</option>`).join("")}
        </select>
        <input type="text" id="${inputId}" placeholder="Enter name" style="display:none;" />
      </div>
    `;
  }

  document.getElementById("startBtn").style.display = "inline";
}

function handleNameDropdown(selectId, inputId) {
  const select = document.getElementById(selectId);
  const input = document.getElementById(inputId);
  input.style.display = select.value === "Other" ? "inline" : "none";
}

function startGame() {
  const count = parseInt(document.getElementById("playerCount").value);
  if (isNaN(count) || count < 1 || count > 20) {
    alert("Please select a valid number of players.");
    return;
  }

  players = [];
  for (let i = 0; i < count; i++) {
    const select = document.getElementById(`select-${i}`);
    const input = document.getElementById(`name-${i}`);
    const selected = select.value;
    const inputted = input.value.trim();
    const name = selected === "Other" ? inputted : selected;

    if (!name) {
      alert(`Player ${i + 1} must have a name.`);
      return;
    }

    players.push({ name, scores: [] });
  }

  gameStarted = true;
  saveGameState();
  document.getElementById("setup").style.display = "none";
  document.getElementById("game").style.display = "block";
  document.querySelector("h1").style.display = "none"; // hide title
  document.querySelector(".top-links").style.display = "none"; // hide menu
  currentPlayerIndex = 0;
  currentHole = 1;
  showHole();
  updateLeaderboard();
  updateScorecard();
}

function showHole() {
  document.getElementById("holeHeader").innerText = `Hole ${currentHole}`;
  const container = document.getElementById("scoreInputs");
  const player = players[currentPlayerIndex];

  container.innerHTML = `
    <div class="input-group">
      <label>${player.name} hits:</label>
      <select id="hits" class="full-width">
        <option value="miss">Miss!</option>
        ${[...Array(9)].map((_, i) => `<option value="${i + 1}">${i + 1}</option>`).join("")}
      </select>
    </div>
  `;
}

function getScore(hits) {
  if (hits === 0) return 5;
  const scores = [3, 2, 1, 0, -1, -2, -3, -4, -5];
  return scores[hits - 1] ?? 5;
}

function getScoreLabelAndColor(hits) {
  const labels = [
    "Double Bogey", "Par", "Birdie", "Ace", "Goose Egg", "Icicle",
    "Polar Bear", "Frostbite", "Snowman", "Avalanche"
  ];
  const colors = [
    "#ff4c4c", "#ffffff", "#00ff00", "#00ffff", "#ffcc00", "#ff66ff",
    "#00bfff", "#ff9933", "#ff69b4", "#ffff00"
  ];
  return { label: labels[hits] ?? "Unknown", color: colors[hits] ?? "#000" };
}

function submitPlayerScore() {
  const hitsValue = document.getElementById("hits").value;
  const hits = hitsValue === "miss" ? 0 : parseInt(hitsValue);
  if (isNaN(hits) || hits < 0 || hits > 9) return alert("Enter a valid number of hits.");

  const score = getScore(hits);
  const player = players[currentPlayerIndex];
  player.scores.push(score);
  saveGameState();

  const { label, color } = getScoreLabelAndColor(hits);
  showScoreAnimation(`${player.name}: ${label}!`, color);
  updateLeaderboard();
  updateScorecard();

  currentPlayerIndex++;
  if (currentPlayerIndex >= players.length) {
    if (currentHole < 18) {
      currentHole++;
      currentPlayerIndex = 0;
    } else {
      updateLeaderboard(true);
      updateScorecard();
      localStorage.removeItem("golfdartsState");
      document.getElementById("scoreInputs").innerHTML = "<h2>Game complete!</h2>";
      const startNewBtn = document.createElement("button");
startNewBtn.innerText = "Start New Round";
startNewBtn.className = "primary-button";
startNewBtn.onclick = () => {
  if (confirm("Start new round with same players?")) {
    players.forEach(p => p.scores = []);
    currentHole = 1;
    currentPlayerIndex = 0;
    gameStarted = true;
    saveGameState();
    showHole();
    updateLeaderboard();
    updateScorecard();
  } else {
    location.reload(); // fallback if they want to reset everything
  }
};
document.getElementById("scoreInputs").appendChild(startNewBtn);

      return;
    }
  }
  showHole();
}

function updateLeaderboard(final = false) {
  const leaderboardDetails = document.getElementById("leaderboardDetails");
  if (!leaderboardDetails) return;

  const sortedPlayers = [...players].map(player => ({
    name: player.name,
    total: player.scores.reduce((sum, s) => sum + (s ?? 0), 0)
  })).sort((a, b) => a.total - b.total);

  let html = "<ol class='leaderboard-list'>";
  sortedPlayers.forEach(p => {
    html += `<li><strong>${p.name}:</strong> ${p.total}</li>`;
  });
  html += "</ol>";

  leaderboardDetails.innerHTML = html;
}

function updateScorecard() {
  const container = document.getElementById("leaderboard");
  if (!container) return;

  let table = `<table class="leaderboard-table">`;

  if (currentHole >= 10) {
    table += `
      <tr><th colspan="11">🏌️ Back Nine</th></tr>
      <tr><th>Player</th>${[...Array(9)].map((_, i) => `<th>${i + 10}</th>`).join('')}<th>In</th></tr>
    `;
    players.forEach(player => {
      const inScores = player.scores.slice(9, 18);
      const inTotal = inScores.reduce((sum, s) => sum + (s ?? 0), 0);
      table += `<tr><td>${player.name}</td>`;
      for (let i = 9; i < 18; i++) {
        table += `<td>${player.scores[i] ?? ""}</td>`;
      }
      table += `<td><strong>${inScores.length === 9 ? inTotal : ""}</strong></td></tr>`;
    });

    table += `
      <tr><th colspan="11">🏌️ Front Nine</th></tr>
      <tr><th>Player</th>${[...Array(9)].map((_, i) => `<th>${i + 1}</th>`).join('')}<th>Out</th></tr>
    `;
    players.forEach(player => {
      const outScores = player.scores.slice(0, 9);
      const outTotal = outScores.reduce((sum, s) => sum + (s ?? 0), 0);
      table += `<tr><td>${player.name}</td>`;
      for (let i = 0; i < 9; i++) {
        table += `<td>${player.scores[i] ?? ""}</td>`;
      }
      table += `<td><strong>${outScores.length === 9 ? outTotal : ""}</strong></td></tr>`;
    });
  } else {
    table += `
      <tr><th colspan="11">🏌️ Front Nine</th></tr>
      <tr><th>Player</th>${[...Array(9)].map((_, i) => `<th>${i + 1}</th>`).join('')}<th>Out</th></tr>
    `;
    players.forEach(player => {
      const outScores = player.scores.slice(0, 9);
      const outTotal = outScores.reduce((sum, s) => sum + (s ?? 0), 0);
      table += `<tr><td>${player.name}</td>`;
      for (let i = 0; i < 9; i++) {
        table += `<td>${player.scores[i] ?? ""}</td>`;
      }
      table += `<td><strong>${outScores.length === 9 ? outTotal : ""}</strong></td></tr>`;
    });

    table += `
      <tr><th colspan="11">🏌️ Back Nine</th></tr>
      <tr><th>Player</th>${[...Array(9)].map((_, i) => `<th>${i + 10}</th>`).join('')}<th>In</th></tr>
    `;
    players.forEach(player => {
      const inScores = player.scores.slice(9, 18);
      const inTotal = inScores.reduce((sum, s) => sum + (s ?? 0), 0);
      table += `<tr><td>${player.name}</td>`;
      for (let i = 9; i < 18; i++) {
        table += `<td>${player.scores[i] ?? ""}</td>`;
      }
      table += `<td><strong>${inScores.length === 9 ? inTotal : ""}</strong></td></tr>`;
    });
  }

  // Total Row
table += `
  <tr><th>Total</th>${[...Array(18)].map((_, i) => {
    return i === 8 || i === 17 ? "<th></th>" : "<th></th>";
  }).join('')}<th></th></tr>
`;

players.forEach(player => {
  const out = player.scores.slice(0, 9).reduce((sum, s) => sum + (s ?? 0), 0);
  const inn = player.scores.slice(9, 18).reduce((sum, s) => sum + (s ?? 0), 0);
  const total = out + inn;

  table += `<tr class="total-row"><td><strong>${player.name} Totals</strong></td>`;
  for (let i = 0; i < 18; i++) {
    table += `<td>${player.scores[i] ?? ""}</td>`;
  }
  table += `<td><strong>${player.scores.length === 18 ? total : "-"}</strong></td></tr>`;
});

table += `</table>`;

  container.innerHTML = table;
}

function undoHole() {
  if (currentHole === 1 && currentPlayerIndex === 0) return alert("Nothing to undo.");

  if (currentPlayerIndex > 0) {
    currentPlayerIndex--;
  } else {
    currentHole--;
    currentPlayerIndex = players.length - 1;
  }

  players[currentPlayerIndex].scores.pop();
  saveGameState();
  showHole();
  updateLeaderboard();
  updateScorecard();
}

function showScoreAnimation(message, color = "#0a3") {
  const el = document.getElementById("scoreAnimation");
  if (!el) return;
  el.style.color = color;
  el.innerText = message;
  el.style.animation = "none";
  void el.offsetWidth;
  el.style.animation = "popIn 0.6s ease-out";
  setTimeout(() => el.innerText = "", 3000);
}

function saveGameState() {
  const state = {
    players,
    currentHole,
    currentPlayerIndex,
    gameStarted
  };
  localStorage.setItem("golfdartsState", JSON.stringify(state));
}

function loadGameState() {
  const saved = localStorage.getItem("golfdartsState");
  if (!saved) return;

  const state = JSON.parse(saved);
  if (!state || !state.players || state.players.length === 0) return;

  if (confirm("Resume your previous game?")) {
    players = state.players;
    currentHole = state.currentHole;
    currentPlayerIndex = state.currentPlayerIndex;
    gameStarted = state.gameStarted;

    document.getElementById("setup").style.display = "none";
    document.getElementById("game").style.display = "block";
    document.querySelector("h1").style.display = "none";
    document.querySelector(".top-links").style.display = "none";
    showHole();
    updateLeaderboard();
    updateScorecard();
  } else {
    localStorage.removeItem("golfdartsState");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const select = document.getElementById("playerCount");
  for (let i = 1; i <= 20; i++) {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = i;
    select.appendChild(opt);
  }
  loadGameState();
});
