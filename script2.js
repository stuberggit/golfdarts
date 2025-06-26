let players = [];
let allPlayers = [];
let currentHole = 1;
let currentPlayerIndex = 0;
let gameStarted = false;
let suddenDeath = false;
let tiedPlayers = [];
let audioEnabled = true;
let randomizedMode = false;
let advancedMode = false;


// ========== GAME SETUP ==========

function toggleHamburgerMenu() {
  const menu = document.getElementById("hamburgerMenu");
  menu.classList.toggle("hidden");
}

// Close hamburger when clicking outside of it
document.addEventListener("DOMContentLoaded", function () {
  const menu = document.getElementById("hamburgerMenu");
  const icon = document.getElementById("hamburgerIcon");

  // Listen for clicks anywhere on the page
  document.addEventListener("click", function (event) {
    // Only close if the menu is open and the click is outside both icon and menu
    if (!menu.classList.contains("hidden") &&
        !menu.contains(event.target) &&
        !icon.contains(event.target)) {
      menu.classList.add("hidden");
    }
  });
});


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

  allPlayers = JSON.parse(JSON.stringify(players));
  gameStarted = true;
  suddenDeath = false;
  tiedPlayers = [];
  currentHole = 1;
  currentPlayerIndex = 0;

  document.getElementById("setup").style.display = "none";
  document.getElementById("game").style.display = "block";
  
  const title = document.querySelector(".header-bar h1");
if (title) title.style.display = "none";

  const hamburger = document.getElementById("hamburgerIcon");
if (hamburger) hamburger.style.display = "block";
   
  showHole();
  updateLeaderboard();
  updateScorecard();
  saveGameState();

  document.body.id = "gameStarted";

}



// ========== GAMEPLAY ==========

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

  if (isNaN(hits) || hits < 0 || hits > 9) {
    alert("Enter a valid number of hits.");
    return;
  }
  const player = players[currentPlayerIndex];
if (hits === 6) {
  const isShanghai = confirm(`Was this a Shanghai (1x, 2x, and 3x of ${currentHole})? Cancel to score -2 and return to game. OK to accept humiliating defeat`);
  if (isShanghai) {
    showShanghaiWin(player.name);
    return; // skip rest of the scoring logic
  }
}
  const score = getScore(hits);
  const allPlayer = allPlayers.find(p => p.name === player.name);

  // Push score to both current and full player lists
  player.scores.push(score);
  if (allPlayer) allPlayer.scores.push(score);

  saveGameState();

  const { label, color } = getScoreLabelAndColor(hits);
  showScoreAnimation(`${player.name}: ${label}!`, color);

  updateLeaderboard();
  updateScorecard();

  // Advance to next player
  currentPlayerIndex++;

  // If all players completed this hole
  if (currentPlayerIndex >= players.length) {
    currentPlayerIndex = 0;

    const totals = players.map(p => p.scores.reduce((a, b) => a + b, 0));
    const lowest = Math.min(...totals);
    const tied = players.filter((p, i) => totals[i] === lowest);

    // Handle end of regular game
    if (currentHole === 18) {
      if (tied.length > 1) {
        players = tied;
        tiedPlayers = tied;
        suddenDeath = true;
        currentHole = 19;

        const names = tied.map(p => `"${p.name}"`).join(" and ");
        document.getElementById("scoreInputs").innerHTML = `
          <h2>${names} tie! On to Sudden Death!</h2>
          <button onclick="showHole()" class="primary-button full-width">Continue</button>

        `;
        return;
      } else {
        endGame();
        return;
      }
    }

    // Handle sudden death
    if (suddenDeath) {
      const lastHoleScores = players.map(p => p.scores[currentHole - 1]);
      const min = Math.min(...lastHoleScores);
      const winners = players.filter((p, i) => lastHoleScores[i] === min);

      if (winners.length === 1) {
        players = [winners[0]];
        endGame();
        return;
      }

      players = winners;
      currentHole = currentHole === 20 ? 1 : currentHole + 1;
    } else {
      currentHole++;
    }
  }

  showHole();
}

  function undoHole() {
  if (currentHole === 1 && currentPlayerIndex === 0) {
    alert("Nothing to undo.");
    return;
  }

  if (currentPlayerIndex > 0) {
    currentPlayerIndex--;
  } else {
    currentHole--;
    currentPlayerIndex = players.length - 1;
  }

  const player = players[currentPlayerIndex];
  const allPlayer = allPlayers.find(p => p.name === player.name);

  if (allPlayer) allPlayer.scores.pop();
  player.scores.pop();

  saveGameState();
  showHole();
  updateLeaderboard();
  updateScorecard();

  // ✅ Make sure to re-sync allPlayers
  allPlayers = JSON.parse(JSON.stringify(players));
}

function showShanghaiWin(winnerName) {
  gameStarted = false;
  localStorage.removeItem("golfdartsState");

  document.getElementById("scoreInputs").innerHTML = "";

  const overlay = document.createElement("div");
  overlay.className = "shanghai-overlay";
  overlay.innerHTML = `
    <h1>🏆 SHANGHAI!!</h1>
    <h2>${winnerName} WINS!</h2>
    <p class="shanghai-subtext">Single + Double + Triple on Hole ${currentHole}</p>
    <button id="playAgainBtn" class="primary-button full-width">Play Again</button>
  `;
  document.body.appendChild(overlay);

  document.getElementById("playAgainBtn").onclick = () => {
    // Restart game with same players
    players.forEach(p => p.scores = []);
    currentHole = 1;
    currentPlayerIndex = 0;
    suddenDeath = false;
    tiedPlayers = [];
    gameStarted = true;

    // Reset UI
    document.body.removeChild(overlay);
    document.getElementById("scoreInputs").innerHTML = "";
    updateLeaderboard();
    updateScorecard();
    showHole();
    saveGameState();
  };

  /*if ('speechSynthesis' in window) {
    const utter = new SpeechSynthesisUtterance(`${winnerName} wins with a Shanghai!`);
    utter.pitch = 1.3;
    utter.rate = 1;
    speechSynthesis.speak(utter);
  }*/
}


// ========== DISPLAY ==========

function updateScorecard() {
  const container = document.getElementById("scorecard");
  if (!container) return;

  let table = `<table class="scorecard-table">`;

  const renderSection = (label, start) => {
    const highlight = (currentHole >= start && currentHole < start + 9);
    table += `
      <tr><th colspan="11"${highlight ? ' style="background-color:#d2ffd2"' : ''}>🏌️ ${label}</th></tr>
      <tr><th>Player</th>${[...Array(9)].map((_, i) => `<th>${i + start}</th>`).join('')}<th>${label === "Front Nine" ? "Out" : "In"}</th></tr>
    `;
    allPlayers.forEach(p => {
      const scores = p.scores.slice(start - 1, start + 8);
      const total = scores.reduce((s, v) => s + (v ?? 0), 0);
      table += `<tr><td style="border: 1px solid #ccc">${p.name}</td>${
        scores.map((s, i) => {
          const holeNum = i + start;
          const isActive = holeNum === currentHole && p.name === players[currentPlayerIndex]?.name;
          const display = s === undefined || s === null ? "&nbsp;" : s;
return `<td style="border: 1px solid #ccc" class="hole-cell-${holeNum}${isActive ? ' active-cell' : ''}">${display}</td>`;

        }).join("")
      }<td style="border: 1px solid #ccc"><strong>${scores.length === 9 ? total : ""}</strong></td></tr>`;
    });
  };

  const renderSuddenDeath = () => {
    const maxHole = Math.max(...allPlayers.map(p => p.scores.length));
    if (maxHole <= 18) return;

    const sdHoles = [];
    for (let i = 19; i <= maxHole; i++) {
      const label = i <= 20 ? i : (i - 20);
      sdHoles.push(label);
    }

    table += `<tr><th colspan="${sdHoles.length + 1}" class="sudden-death-header">🏌️ Sudden Death</th></tr>`;
    table += `<tr><th class="sudden-death-header">Player</th>${sdHoles.map(h => `<th class="sudden-death-header">${h}</th>`).join("")}</tr>`;

    allPlayers.forEach(p => {
      const isTiedPlayer = players.some(tp => tp.name === p.name);
const sdScores = isTiedPlayer ? p.scores.slice(18) : [];
      table += `<tr class="sudden-death-row"><td class="sudden-death-cell">${p.name}</td>`;
      for (let i = 0; i < sdHoles.length; i++) {
        const holeNum = i + 19;
        const isActive = holeNum === currentHole && p.name === players[currentPlayerIndex]?.name;
let cellContent = isTiedPlayer ? (sdScores[i] ?? "") : "–";
table += `<td class="sudden-death-cell hole-cell-${holeNum}${isActive ? ' active-cell' : ''}">${cellContent}</td>`;

      }
      table += `</tr>`;
    });
  };

  renderSuddenDeath();
  if (currentHole > 9) renderSection("Back Nine", 10);
  renderSection("Front Nine", 1);

  table += "</table>";
  container.innerHTML = table;

  // Scroll to the active cell on mobile
  const activeCell = document.querySelector(".active-cell");
  if (activeCell) {
    activeCell.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }

  const scoreInputs = document.getElementById("scoreInputs");
  if (!gameStarted && players.length === 1 && scoreInputs.innerText.includes("Game complete")) {
    const winText = document.createElement("h2");
    winText.textContent = `${players[0].name} wins!!`;
    winText.style.color = "#ffff00";
    winText.style.textShadow = "1px 1px 4px black";
    scoreInputs.appendChild(winText);
  }
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

function showScoreAnimation(message, color = "#0a3") {
  const el = document.getElementById("scoreAnimation");
  if (!el) return;
  el.style.color = color;
  el.innerText = message;
  el.style.animation = "none";
  void el.offsetWidth;
  el.style.animation = "popIn 0.6s ease-out";
  setTimeout(() => el.innerText = "", 3000);

  if (audioEnabled && 'speechSynthesis' in window) {
    const utter = new SpeechSynthesisUtterance(message.replace(/[^"]+/g, ''));
    utter.rate = 1;
    utter.pitch = 1.2;
    speechSynthesis.speak(utter);
  }
}

// ========== STATE MGMT ==========

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

  if (confirm("Want to keep playing? OK to return to your game. Cancel to restart")) {
    players = state.players;
    currentHole = state.currentHole;
    currentPlayerIndex = state.currentPlayerIndex;
    gameStarted = state.gameStarted;
    allPlayers = JSON.parse(JSON.stringify(players));

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
  gameStarted = false;

  if (suddenDeath) players = allPlayers;
  updateLeaderboard(true);
  updateScorecard();
  localStorage.removeItem("golfdartsState");

  const scoreInputs = document.getElementById("scoreInputs");
  scoreInputs.innerHTML = "<h2>Game complete!</h2>";

  // Game Stats Button (replaces Submit Score)
  const statsBtn = document.createElement("button");
  statsBtn.innerText = "Game Stats";
  statsBtn.className = "primary-button full-width";
  statsBtn.style.borderColor = "#ffcc00"; // Sudden death yellow border
  statsBtn.onclick = () => showStats();
  scoreInputs.appendChild(statsBtn);

  document.body.removeAttribute("id");

  // Start New Round Button
  const startNewBtn = document.createElement("button");
  startNewBtn.innerText = "Start New Round";
  startNewBtn.className = "primary-button full-width";
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
  scoreInputs.appendChild(startNewBtn);
}


function showStats() {
  const modal = document.getElementById("gameStatsModal");
  if (!modal) return;

  const statsContainer = document.getElementById("statsDetails");
  if (!statsContainer) return;

  const scoreLabels = [
    "Double Bogey", "Par", "Birdie", "Ace", "Goose Egg",
    "Icicle", "Polar Bear", "Frostbite", "Snowman", "Avalanche"
  ];

  const hitCounts = allPlayers.map(player => {
    const counts = Array(10).fill(0);
    player.scores.forEach(score => {
      const hitIndex = getHitsFromScore(score);
      if (hitIndex !== -1) counts[hitIndex]++;
    });
    return { name: player.name, counts };
  });

  statsContainer.innerHTML = hitCounts.map(player => {
    const bullets = player.counts
      .map((count, i) => count > 0 ? `<li>${count} ${scoreLabels[i]}</li>` : '')
      .filter(line => line).join("");
    return `<strong>${player.name}</strong><ul>${bullets}</ul>`;
  }).join("<hr>");

  modal.classList.remove("hidden");
}

// Helper: map score back to hit count
function getHitsFromScore(score) {
  const map = {
    5: 0,
    3: 1,
    2: 2,
    1: 3,
    0: 4,
    [-1]: 5,
    [-2]: 6,
    [-3]: 7,
    [-4]: 8,
    [-5]: 9
  };
  return map[score] ?? -1;
}


// ========== MODALS ==========

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

window.showModal = showModal;
window.closeModal = closeModal;

window.addEventListener("DOMContentLoaded", () => {
  const select = document.getElementById("playerCount");

  for (let i = 1; i <= 20; i++) {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = `${i} Player${i > 1 ? "s" : ""}`;
    select.appendChild(option);
  }
  
document.getElementById("audioToggle").addEventListener("change", (e) => {
  audioEnabled = e.target.checked;
});

  document.getElementById("randomizeToggle").addEventListener("change", (e) => {
  randomizedMode = e.target.checked;
});

document.getElementById("advancedToggle").addEventListener("change", (e) => {
  advancedMode = e.target.checked;
});
  
window.addEventListener("beforeunload", function (e) {
  const saved = localStorage.getItem("golfdartsState");
  if (saved) {
    // Show confirmation dialog
    e.preventDefault(); // Modern browsers ignore this but required by spec
    e.returnValue = ""; // Triggers browser confirmation prompt
  }
});

  // ✅ ADD THIS to auto-trigger name inputs when count is selected
  select.addEventListener("change", createPlayerInputs);

  window.addEventListener("load", loadGameState);
