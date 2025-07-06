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
let hazardHoles = [];

console.log("script2.js loaded");

// ========== GAME SETUP ==========

function toggleHamburgerMenu() {
  const menu = document.getElementById("hamburgerMenu");
  menu.classList.toggle("hidden");
}

// ===== createPlayerInputs Function (Core: DO NOT OVERWRITE without discussion) =====
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

// Fix duplicate declaration error by using single declaration for shared variables
let activeCell;
let scoreInputs;


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

  // Start with hits input
  container.innerHTML = `
    <div class="input-group">
      <label>${player.name} hits:</label>
      <select id="hits" class="full-width">
        <option value="miss">Miss!</option>
        ${[...Array(9)].map((_, i) => `<option value="${i + 1}">${i + 1}</option>`).join("")}
      </select>
    </div>
  `;

  // Append hazard checkbox only if this is a hazard hole in advanced mode
  if (advancedMode && hazardHoles.includes(currentHole)) {
    const hazardWrapper = document.createElement("div");
    hazardWrapper.className = "hazard-toggle";
    hazardWrapper.innerHTML = `<label><input type="checkbox" class="hazardCheckbox"> Hit Hazard</label>`;
    container.appendChild(hazardWrapper);
  }

  // Optional: Highlight the hazard hole in the scorecard (visual feedback)
  highlightHazardHole(currentHole);
  document.getElementById("scorecardWrapper").style.display = "block";
  updateScorecard();

}

function highlightHazardHole(hole) {
  // Placeholder for future Advanced Mode UI enhancement
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

  // Check for Shanghai
  if (hits === 6) {
    const isShanghai = confirm(`Was this a Shanghai (1x, 2x, and 3x of ${currentHole})? Cancel to score -2 and return to game. OK to accept humiliating defeat`);
    if (isShanghai) {
      showShanghaiWin(player.name);
      return;
    }
  }

  // Get base score
  let score = getScore(hits);

  // Hazard penalty if applicable
  const hazardCheckboxes = document.querySelectorAll(".hazardCheckbox");
  if (
    advancedMode &&
    hazardHoles.includes(currentHole) &&
    hazardCheckboxes[currentPlayerIndex] &&
    hazardCheckboxes[currentPlayerIndex].checked
  ) {
    score += 1;
    player.hazards = (player.hazards || 0) + 1;
  }

  if (player) {
  const allPlayer = allPlayers.find(p => p.name === player.name);
  player.scores.push(score);
  if (allPlayer) allPlayer.scores.push(score);
} else {
  console.warn("No current player found during score submission.");
  return;
}

  saveGameState();

  const { label, color } = getScoreLabelAndColor(hits);

  // Determine if game is about to end
  let gameWillEnd = false;
  let winnerName = "";

  if (!suddenDeath && currentHole === 18 && currentPlayerIndex === players.length - 1) {
    const totals = players.map(p => p.scores.reduce((a, b) => a + b, 0));
    const lowest = Math.min(...totals);
    const tied = players.filter((p, i) => totals[i] === lowest);
    if (tied.length === 1) {
      winnerName = tied[0].name;
      players = [tied[0]];
      endGame();
      return;
    }
  }

  if (suddenDeath) {
    const allPlayersCompletedHole = players.every(p => p.scores.length >= currentHole);
    if (allPlayersCompletedHole) {
      const lastHoleScores = players.map(p => p.scores[currentHole - 1]);
      const min = Math.min(...lastHoleScores);
      const winners = players.filter((p, i) => lastHoleScores[i] === min);
      if (winners.length === 1) {
        players = [winners[0]];
        endGame();
        return;
      }
    }
  }

  // Only show animation if game is NOT ending
  showScoreAnimation(`${player.name}: ${label}!`, color);

  updateLeaderboard();
  updateScorecard();

  currentPlayerIndex++;

  if (currentPlayerIndex >= players.length) {
    currentPlayerIndex = 0;

    const totals = players.map(p => p.scores.reduce((a, b) => a + b, 0));
    const lowest = Math.min(...totals);
    const tied = players.filter((p, i) => totals[i] === lowest);

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

    if (suddenDeath) {
      const allPlayersCompletedHole = players.every(p => p.scores.length >= currentHole);
      if (allPlayersCompletedHole) {
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
      }
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

    const isSudden = suddenDeath;
const competingNames = isSudden ? players.map(p => p.name) : [];

const sortedPlayers = [...allPlayers].sort((a, b) => {
  const aIn = competingNames.includes(a.name);
  const bIn = competingNames.includes(b.name);
  return bIn - aIn; // Competing players first
});

sortedPlayers.forEach(p => {
  const scores = p.scores.slice(start - 1, start + 8);
  const total = scores.reduce((s, v) => s + (v ?? 0), 0);
  const isCompeting = competingNames.includes(p.name);

  const playerNameStyle = isSudden && !isCompeting
    ? 'text-decoration: line-through; color: gray'
    : '';

  table += `<tr><td style="border: 1px solid #ccc; ${playerNameStyle}">${p.name}</td>${
    scores.map((s, i) => {
      const holeNum = i + start;
      const isActive = holeNum === currentHole && p.name === players[currentPlayerIndex]?.name;
      const display = (s === undefined || s === null)
        ? (isSudden && !isCompeting ? "-" : "&nbsp;")
        : s;
      return `<td style="border: 1px solid #ccc" class="hole-cell-${holeNum}${isActive ? ' active-cell' : ''}">${display}</td>`;
    }).join("")
  }<td style="border: 1px solid #ccc"><strong>${scores.length === 9 ? total : ""}</strong></td></tr>`;
});

  };

  const renderSuddenDeath = () => {
    const maxHole = Math.max(...allPlayers.map(p => p.scores.length));
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

  // Render sections
  const allCompletedFront = allPlayers.every(p => p.scores.length >= 9);

  if (suddenDeath) renderSuddenDeath();  // ✅ Sudden Death shown on top

  if (currentHole >= 10 && allCompletedFront) {
    renderSection("Back Nine", 10);
    renderSection("Front Nine", 1);
  } else {
    renderSection("Front Nine", 1);
    if (allCompletedFront) renderSection("Back Nine", 10);
  }

  table += "</table>";
  container.innerHTML = table;

  const activeCell = document.querySelector(".active-cell");
  if (activeCell) {
    activeCell.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }

  // Show winner message if game ends early (e.g. Shanghai win)
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

  const proceed = confirm("Want to keep playing? OK to return to your game. Cancel to restart");
  if (!proceed) {
    localStorage.removeItem("golfdartsState");
    return;
  }

  // Continue game setup
  players = state.players;
  currentHole = state.currentHole;
  currentPlayerIndex = state.currentPlayerIndex;
  gameStarted = state.gameStarted;
  allPlayers = JSON.parse(JSON.stringify(players));

  document.querySelector(".top-links").style.display = "none";
  document.getElementById("setup").style.display = "none";
  document.getElementById("game").style.display = "block";
  const title = document.querySelector(".header-bar h1");
  if (title) title.style.display = "none";

  showHole();
  updateLeaderboard();
  updateScorecard();
  document.body.id = "gameStarted";
}

function endGame() {
  gameStarted = false;

  // ✅ Only restore allPlayers if still tied (players.length > 1)
  if (suddenDeath && players.length > 1) {
    players = allPlayers;
  }

  updateLeaderboard();
  updateScorecard();
  localStorage.removeItem("golfdartsState");

  const scoreInputs = document.getElementById("scoreInputs");
  if (!scoreInputs) {
    console.warn("scoreInputs container not found. Skipping stats and winner buttons.");
    return;
  }

  // Declare winner if only one player left
  if (players.length === 1) {
    const winText = document.createElement("h2");
    winText.textContent = `${players[0].name} wins!!`;
    winText.style.color = "#ffff00";
    winText.style.textShadow = "1px 1px 4px black";
    scoreInputs.appendChild(winText);
  }

  // Game Stats Button
  const statsBtn = document.createElement("button");
  statsBtn.innerText = "Game Stats";
  statsBtn.className = "primary-button full-width";
  statsBtn.style.borderColor = "#ffcc00";
  statsBtn.onclick = () => showStats();
  scoreInputs.appendChild(statsBtn);

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

  // Leaderboard Button
const lbBtn = document.createElement("button");
lbBtn.innerText = "Show Leaderboard";
lbBtn.className = "primary-button full-width";
lbBtn.onclick = () => toggleLeaderboard(true);
scoreInputs.appendChild(lbBtn);


  document.body.removeAttribute("id");
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


// ========== ADVANCED MODE ==========

const dartboardNeighbors = {
  1: [20, 18],
  2: [17, 15],
  3: [19, 17],
  4: [18, 13],
  5: [12, 20],
  6: [10, 13],
  7: [16, 19],
  8: [11, 16],
  9: [14, 12],
  10: [6, 15],
  11: [8, 14],
  12: [9, 5],
  13: [6, 4],
  14: [11, 9],
  15: [2, 10],
  16: [7, 8],
  17: [3, 2],
  18: [1, 4],
  19: [7, 3],
  20: [5, 1],
};

function selectHazardHoles() {
  const allHoles = [...Array(18)].map((_, i) => i + 1);
  hazardHoles = allHoles.sort(() => 0.5 - Math.random()).slice(0, 6);
}

const dartHits = [
  { number: 20, multiplier: 2 },
  { number: 1, multiplier: 1 },
  { number: 1, multiplier: 1 },
];

function checkHazardPenalty(hole, dartHits) {
  const neighbors = dartboardNeighbors[hole];
  return dartHits.some(d => neighbors.includes(d.number) && d.multiplier >= 2);
}

if (document.getElementById("hazardPenalty")?.checked) {
  score += 1;
}

// ========== EVENT LISTENERS ==========

window.addEventListener("DOMContentLoaded", () => {
  const select = document.getElementById("playerCount");

  // Populate the dropdown
  for (let i = 1; i <= 20; i++) {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = `${i} Player${i > 1 ? "s" : ""}`;
    select.appendChild(option);
  }

  // Add checkbox toggle listeners (check IDs match your HTML)
  document.getElementById("audioToggle").addEventListener("change", (e) => {
    audioEnabled = e.target.checked;
  });

  document.getElementById("randomToggle").addEventListener("change", (e) => {
    randomizedMode = e.target.checked;
  });

  document.getElementById("advancedToggle").addEventListener("change", (e) => {
    advancedMode = e.target.checked;
  });

  // Trigger name inputs when player count is selected
  select.addEventListener("change", createPlayerInputs);
});

// Add unload protection if a saved game is in progress
window.addEventListener("beforeunload", function (e) {
  const saved = localStorage.getItem("golfdartsState");
  if (saved) {
    e.preventDefault();
    e.returnValue = ""; // Required for most browsers to show warning
  }
});

// Load saved game state on full window load (after assets)
window.addEventListener("DOMContentLoaded", () => {
  requestAnimationFrame(() => {
    loadGameState();
  });
});



window.addEventListener("beforeunload", function (e) {
  const saved = localStorage.getItem("golfdartsState");
  if (saved) {
    e.preventDefault();
    e.returnValue = "";
  }
});

