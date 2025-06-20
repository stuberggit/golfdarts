let players = [];
let currentHole = 1;
let currentPlayerIndex = 0;
let gameStarted = false;
let suddenDeath = false;
let suddenDeathHole = 19;
let tiedPlayers = [];

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

    const label = document.createElement("label");
    label.setAttribute("for", selectId);
    label.textContent = `Player ${i + 1}:`;

    const selectEl = document.createElement("select");
    selectEl.id = selectId;
    selectEl.addEventListener("change", () => handleNameDropdown(selectId, inputId));

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.disabled = true;
    defaultOption.selected = true;
    defaultOption.textContent = "Select Player";
    selectEl.appendChild(defaultOption);

    playerOptions.forEach(name => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      selectEl.appendChild(option);
    });

    const inputEl = document.createElement("input");
    inputEl.id = inputId;
    inputEl.placeholder = "Enter name";
    inputEl.style.display = "none";

    const wrapper = document.createElement("div");
    wrapper.className = "playerInputBlock";
    wrapper.appendChild(label);
    wrapper.appendChild(selectEl);
    wrapper.appendChild(inputEl);

    container.appendChild(wrapper);
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
  document.querySelector(".top-links").style.display = "none";
  document.getElementById("setup").style.display = "none";
  document.getElementById("game").style.display = "block";
  document.querySelector("h1").style.display = "none";
  currentPlayerIndex = 0;
  currentHole = 1;
  showHole();
  updateLeaderboard();
  updateScorecard();
  saveGameState();
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
    currentPlayerIndex = 0;

    if (currentHole === 18) {
      const lowest = Math.min(...players.map(p => p.scores.reduce((a, b) => a + b, 0)));
      const tied = players.filter(p => p.scores.reduce((a, b) => a + b, 0) === lowest);

      if (tied.length > 1) {
        players = tied;
        tied.forEach(p => p.scores.length = 18);
        currentHole = 19;
      } else {
        endGame();
        return;
      }
    } else if (currentHole >= 19) {
      const lowest = Math.min(...players.map(p => p.scores.reduce((a, b) => a + b, 0)));
      const tied = players.filter(p => p.scores.reduce((a, b) => a + b, 0) === lowest);

      if (tied.length > 1) {
        players = tied;
        currentHole = currentHole === 20 ? 1 : currentHole + 1;
      } else {
        endGame();
        return;
      }
    } else {
      currentHole++;
    }
  }

  showHole();
}

function updateLeaderboard(final = false) {
  const leaderboardDetails = document.getElementById("leaderboardDetails");
  if (!leaderboardDetails) return;

  const sorted = [...players].map(p => ({
    name: p.name,
    total: p.scores.reduce((sum, s) => sum + (s ?? 0), 0)
  })).sort((a, b) => a.total - b.total);

  leaderboardDetails.innerHTML = `
  <ul class="leaderboard-list">
    ${sorted.map((p, i) => `
      <li${i === 0 ? ' class="first-place"' : ''}>
        <span>${p.name}</span>
        <span>${p.total}</span>
      </li>
    `).join("")}
  </ul>
  `;
}

function updateScorecard() {
  const container = document.getElementById("scorecard");
  if (!container) return;

  let table = `<table class="scorecard-table">`;

  const renderSection = (label, start) => {
    table += `
      <tr><th colspan="11">🏌️ ${label}</th></tr>
      <tr><th>Player</th>${[...Array(9)].map((_, i) => `<th>${i + start}</th>`).join('')}<th>${label === "Front Nine" ? "Out" : "In"}</th></tr>
    `;
    players.forEach(p => {
      const scores = p.scores.slice(start - 1, start + 8);
      const total = scores.reduce((s, v) => s + (v ?? 0), 0);
      table += `<tr><td>${p.name}</td>${scores.map(s => `<td>${s ?? ""}</td>`).join("")}<td><strong>${scores.length === 9 ? total : ""}</strong></td></tr>`;
    });
  };

  if (currentHole >= 10) {
    renderSection("Back Nine", 10);
    renderSection("Front Nine", 1);
  } else {
    renderSection("Front Nine", 1);
    renderSection("Back Nine", 10);
  }

  table += "</table>";
  container.innerHTML = table;
}

function undoHole() {
  if (currentHole === 1 && currentPlayerIndex === 0) return alert("Nothing to undo.");
  if (currentPlayerIndex > 0) currentPlayerIndex--;
  else {
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

    document.querySelector(".top-links").style.display = "none";
    document.getElementById("setup").style.display = "none";
    document.getElementById("game").style.display = "block";
    document.querySelector("h1").style.display = "none";

    showHole();
    updateLeaderboard();
    updateScorecard();
  } else {
    localStorage.removeItem("golfdartsState");
  }
}

function endGame() {
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
      location.reload();
    }
  };
  document.getElementById("scoreInputs").appendChild(startNewBtn);
}

function showModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  if (!gameStarted && id === 'leaderboardModal') return;
  modal.classList.remove('hidden');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('hidden');
}

// Attach modal functions to global scope
window.showModal = showModal;
window.closeModal = closeModal;

// Initialize on DOM load
window.addEventListener("DOMContentLoaded", () => {
  const select = document.getElementById("playerCount");
  for (let i = 1; i <= 20; i++) {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = i;
    select.appendChild(opt);
  }
  loadGameState();
});
