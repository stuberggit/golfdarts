// Global state
let players = [];
let allPlayers = [];
let currentHole = 1;
let currentPlayerIndex = 0;
let gameStarted = false;
let suddenDeath = false;
let tiedPlayers = [];
let audioEnabled = true;
let advancedMode = false;
let hazardHoles = [];
let actionHistory = [];
let randomMode = false;
let history = [];
let filterSelect;
let container;

// Detect environment
const isPreProd = window.location.pathname.includes("index2.html");
const isAde = window.location.pathname.includes("index3.html");

// History key per environment
let historyKey;
if (isPreProd) {
  historyKey = "golfdartsHistory_preprod";
} else if (isAde) {
  historyKey = "golfdartsHistory_ade";
} else {
  historyKey = "golfdartsHistory_prod";
}

console.log("script.js loaded");
console.log("Parsed History:", history);

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
    const handicapId = `handicap-${i}`;

    // Create the player name dropdown
    const selectEl = document.createElement("select");
    selectEl.id = selectId;
    selectEl.classList.add("player-select");
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

    // Custom name input (hidden unless "Other" is chosen)
    const inputEl = document.createElement("input");
    inputEl.id = inputId;
    inputEl.placeholder = "Enter name";
    inputEl.style.display = "none";

    // Handicap dropdown
    const handicapSelect = document.createElement("select");
    handicapSelect.id = handicapId;
    handicapSelect.classList.add("handicap-select");

    for (let h = -10; h <= 10; h++) {
      const opt = document.createElement("option");
      opt.value = h;
      opt.textContent = (h > 0 ? "+" : "") + h;
      if (h === 0) opt.selected = true;
      handicapSelect.appendChild(opt);
    }

    // Wrapper for both dropdowns in one row
    const wrapper = document.createElement("div");
    wrapper.className = "playerInputRow";
    wrapper.appendChild(selectEl);
    wrapper.appendChild(inputEl); // still in DOM, just hidden
    wrapper.appendChild(handicapSelect);

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

let holeSequence = [];
let currentHoleIndex = 0;

function shuffleArray(array) {
  let currentIndex = array.length, randomIndex;

  // While there remain elements to shuffle.
  while (currentIndex !== 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // Swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }

  return array;
}

console.log("Random Mode is", randomMode);

function startGame() {
  const count = parseInt(document.getElementById("playerCount").value);
  if (isNaN(count) || count < 1 || count > 20) {
    alert("Please select a valid number of players.");
    return;
  }

  if (randomMode && advancedMode) {
    alert("You cannot start a game with both Random Mode and Advanced Mode selected.");
    return;
  }

  players = [];
  for (let i = 0; i < count; i++) {
    const select = document.getElementById(`select-${i}`);
    const input = document.getElementById(`name-${i}`);
    const handicapSelect = document.getElementById(`handicap-${i}`);
    
    const selected = select.value;
    const inputted = input.value.trim();
    const name = selected === "Other" ? inputted : selected;
    const handicap = parseInt(handicapSelect?.value || 0, 10);

    if (!name) {
      alert(`Player ${i + 1} must have a name.`);
      return;
    }
    players.push({ name, scores: [], handicap: handicap });
  }

  allPlayers = JSON.parse(JSON.stringify(players));
  gameStarted = true;
  suddenDeath = false;
  tiedPlayers = [];
  currentHole = 1;
  currentHoleIndex = 0;
  currentPlayerIndex = 0;
  actionHistory = [];

  if (advancedMode) {
    setupHazardHoles();
  }

  if (randomMode) {
    holeSequence = shuffleArray([...Array.from({ length: 20 }, (_, i) => i + 1), "🎯"]);
  } else {
    holeSequence = Array.from({ length: 20 }, (_, i) => i + 1);
  }

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

function showHole() {
  let displayHole;

  if (randomMode) {
    displayHole = suddenDeath ? currentHole : holeSequence[currentHoleIndex];
  } else {
    displayHole = currentHole;
  }

  const headerText = displayHole === "🎯" ? "🎯" : `Hole ${displayHole}`;
  document.getElementById("holeHeader").innerText = headerText;

  const container = document.getElementById("scoreInputs");
  const player = players[currentPlayerIndex];

  container.innerHTML = '';

  if (advancedMode && displayHole !== "🎯") {
    const advancedWrapper = document.createElement('div');
    advancedWrapper.className = 'advanced-inputs';

    // Player hits
    const playerGroup = document.createElement('div');
    playerGroup.className = 'input-group';
    playerGroup.innerHTML = `
      <label>${player.name} hits:</label>
      <select id="hits">
        <option value="miss">Miss!</option>
        ${[...Array(9)].map((_, i) => `<option value="${i + 1}">${i + 1}</option>`).join("")}
      </select>
    `;
    advancedWrapper.appendChild(playerGroup);

    // Hazard hits (always visible, disabled on non-hazard holes)
    const hazardGroup = document.createElement('div');
    hazardGroup.className = 'input-group';
    const isHazard = hazardHoles.includes(displayHole);
    hazardGroup.innerHTML = `
      <label>Hazards hit:</label>
      <select class="hazardSelect" ${isHazard ? '' : 'disabled'}>
        <option value="0">0</option>
        <option value="1">1</option>
        <option value="2">2</option>
        <option value="3">3</option>
      </select>
    `;
    advancedWrapper.appendChild(hazardGroup);

    container.appendChild(advancedWrapper);
  } else {
    // Non-advanced or normal/random mode: single player hits dropdown centered
    const singleWrapper = document.createElement('div');
    singleWrapper.className = 'single-select';
    singleWrapper.innerHTML = `
      <label>${player.name} hits:</label>
      <select id="hits">
        <option value="miss">Miss!</option>
        ${[...Array(9)].map((_, i) => `<option value="${i + 1}">${i + 1}</option>`).join("")}
      </select>
    `;
    container.appendChild(singleWrapper);
  }

  if (advancedMode && displayHole !== "🎯") {
    highlightHazardHole(displayHole);
  }

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
  const labels = {
    8: "Buster",
    7: "Quad Bogey",
    6: "Triple Bogey",
    5: "Double Bogey",
    4: "Bogey",
    3: "Par",
    2: "Birdie",
    1: "Ace",
    0: "Goose Egg",
    "-1": "Icicle",
    "-2": "Polar Bear",
    "-3": "Frostbite",
    "-4": "Snowman",
    "-5": "Avalanche"
  };

  const colors = {
    8: "#dc143c",     // Crimson (Buster)
    7: "#8a2be2",     // Blue Violet (Quad Bogey)
    6: "#c71585",     // Medium Violet Red (Triple Bogey)
    5: "#ff4c4c",     // Red (Double Bogey)
    4: "#ff8c00",     // Dark Orange (Bogey)
    3: "#00ff00",     // Bright Green (Par)
    2: "#00ffff",     // Cyan (Birdie)
    1: "#00bfff",     // Deep Sky Blue (Ace)
    0: "#ffcc00",     // Gold (Goose Egg)
    "-1": "#7fffd4",  // Aquamarine (Icicle)
    "-2": "#66cdaa",  // Medium Aquamarine (Polar Bear)
    "-3": "#20b2aa",  // Light Sea Green (Frostbite)
    "-4": "#5f9ea0",  // Cadet Blue (Snowman)
    "-5": "#2f4f4f"   // Dark Slate Gray (Avalanche)
  };

  const label = labels[hits] ?? "Unknown";
  const color = colors[hits] ?? "#ffffff"; // white fallback

  return { label, color };
}


// Track number of holes actually played
let holesPlayedCount = 0;

function submitPlayerScore() {
  const hitsValue = document.getElementById("hits").value;
  const hits = hitsValue === "miss" ? 0 : parseInt(hitsValue);

  if (isNaN(hits) || hits < 0 || hits > 9) {
    alert("Enter a valid number of hits.");
    return;
  }

  const player = players[currentPlayerIndex];

  // Check for Shanghai (6 hits means triple hit)
  if (hits === 6) {
    const holeNum = randomMode && !suddenDeath ? holeSequence[currentHoleIndex] : currentHole;
    const isShanghai = confirm(`Was this a Shanghai (1x, 2x, and 3x of ${holeNum})? Cancel to score -2 and return to game. OK to win with a Shanghai! Now go get your picture taken`);
    if (isShanghai) {
      // Call the new, updated function with optional audio preserved
      showShanghaiWin(player.name);
      return; // Stop any further scoring/turn advancement
    }
  }

  // Base score calculation: miss = 5, otherwise lookup
  let score = getScore(hits);

  // Add hazard penalties if applicable
  let hazards = 0;
  const displayHole = randomMode && !suddenDeath ? holeSequence[currentHoleIndex] : currentHole;

  if (advancedMode && hazardHoles.includes(displayHole) && displayHole !== "🎯") {
    const hazardSelect = document.querySelector(".hazardSelect");
    if (hazardSelect) {
      hazards = parseInt(hazardSelect.value) || 0;
      if (hazards > 0) {
        score += hazards;
        player.hazards = (player.hazards || 0) + hazards;
      }
    }
  }

  // Record the score for player
  player.scores.push(score);

  // Also update in allPlayers copy if exists
  const allPlayer = allPlayers.find(p => p.name === player.name);
  if (allPlayer) {
    allPlayer.scores.push(score);
  }

  // Record action for undo history
  actionHistory.push({
    playerIndex: currentPlayerIndex,
    playerName: player.name,
    hole: displayHole,
    score: score,
    hazards: hazards
  });

  // Save current game state
  saveGameState();

  // Save/update history
  try {
    let history = JSON.parse(localStorage.getItem(historyKey)) || [];
    history.push({
      timestamp: Date.now(),
      players: JSON.parse(JSON.stringify(players)),
      currentHole,
      finished: currentHole > 18 || (randomMode && currentHoleIndex >= 18)
    });
    localStorage.setItem(historyKey, JSON.stringify(history));
  } catch (e) {
    console.error("Failed to save history:", e);
  }

  // Show scoring animation
  const { label, color } = getScoreLabelAndColor(score);
  showScoreAnimation(`${player.name}: ${label}!`, color);

  updateLeaderboard();
  updateScorecard();

  // Advance turn
  currentPlayerIndex++;

  if (currentPlayerIndex >= players.length) {
    currentPlayerIndex = 0;

    // Hole progression logic
    if (!randomMode) {
      if (currentHole < 18) {
        currentHole++;
      } else {
        const totals = players.map(p => p.scores.reduce((a, b) => a + b, 0) + (p.handicap || 0));
        const lowest = Math.min(...totals);
        const tied = players.filter((p, i) => totals[i] === lowest);

        if (tied.length > 1) {
          players = tied;
          tiedPlayers = tied;
          suddenDeath = true;
          currentHole = getRandomSuddenDeathHole();
        } else {
          endGame();
          return;
        }
      }
    } else {
      currentHoleIndex++;
      if (currentHoleIndex >= 18) {
        const totals = players.map(p => p.scores.reduce((a, b) => a + b, 0) + (p.handicap || 0));
        const lowest = Math.min(...totals);
        const tied = players.filter((p, i) => totals[i] === lowest);

        if (tied.length > 1) {
          players = tied;
          tiedPlayers = tied;
          suddenDeath = true;
          currentHoleIndex = null;
          currentHole = getRandomSuddenDeathHole();
        } else {
          endGame();
          return;
        }
      }
    }
  }

  showHole();
}

// Random sudden death hole (1–20 or Bullseye)
function getRandomSuddenDeathHole() {
  const options = [...Array(20).keys()].map(n => n + 1).concat(["🎯"]);
  return options[Math.floor(Math.random() * options.length)];
}

  function undoHole() {
  if (!actionHistory || actionHistory.length === 0) {
    alert("Nothing to undo.");
    return;
  }

  const last = actionHistory.pop();
  if (!last) {
    alert("Nothing to undo.");
    return;
  }

  // Find the player index in the current players array by name (handles rotations)
  let playerIndex = last.playerIndex;
  if (!players[playerIndex] || players[playerIndex].name !== last.playerName) {
    // fallback: find by name
    const found = players.findIndex(p => p.name === last.playerName);
    if (found !== -1) playerIndex = found;
  }

  const player = players[playerIndex];
  const allPlayer = allPlayers.find(p => p.name === last.playerName);

  // Remove the last score entry for that player (if present)
  if (player && player.scores && player.scores.length > 0) {
    player.scores.pop();
  }

  if (allPlayer && allPlayer.scores && allPlayer.scores.length > 0) {
    allPlayer.scores.pop();
  }

  // If a hazard was added during that action, decrement hazard counter
  if (last.hazardAdded && player) {
    player.hazards = Math.max(0, (player.hazards || 0) - 1);
    if (allPlayer) allPlayer.hazards = Math.max(0, (allPlayer.hazards || 0) - 1);
  }

  // Restore UI state to that turn (player and hole)
  currentHole = last.hole;
  currentPlayerIndex = playerIndex;

  // Keep game state valid
  gameStarted = true;
  suddenDeath = false; // optional: you may want to recalc if undoing during sudden death

  saveGameState();
  showHole();
  updateLeaderboard();
  updateScorecard();
}

// Helper to remove the shanghai image + overlay from the DOM
function removeShanghaiDisplay() {
  const img = document.getElementById("shanghaiImage");
  if (img) img.remove();

  document.querySelectorAll(".shanghai-overlay").forEach(el => el.remove());

  // remove the body flag if you use it for dimming
  document.body.classList.remove("shanghai-bg");
}

function showShanghaiWin(playerName, holeNumber) {
  // Ensure valid hole number
  const hole = holeNumber ?? currentHole;

  // Ensure background exists
  let bg = document.getElementById("shanghaiBackground");
  if (!bg) {
    bg = document.createElement("div");
    bg.id = "shanghaiBackground";
    bg.style.position = "fixed";
    bg.style.top = "0";
    bg.style.left = "0";
    bg.style.width = "100%";
    bg.style.height = "100%";
    bg.style.backgroundSize = "cover";
    bg.style.backgroundPosition = "center";
    bg.style.zIndex = "1000"; // below overlay
    document.body.appendChild(bg);
  }

  // Preload image first
  const img = new Image();
  img.src = "images/shanghai.jpg";
  img.onload = () => {
    bg.style.backgroundImage = `url(${img.src})`;
    bg.style.display = "block";

    // Remove any existing overlay text
    let overlay = document.querySelector(".shanghai-overlay");
    if (overlay) overlay.remove();

    // Create overlay container for text
    overlay = document.createElement("div");
    overlay.classList.add("shanghai-overlay");
    overlay.style.zIndex = "1001"; // above background

    // Add overlay content
    overlay.innerHTML = `
      <h1>Shanghai!</h1>
      <h2>🏆 ${playerName} Wins! 🏆</h2>
      <p>Single + Double + Triple on Hole ${hole}!</p>
    `;

    document.body.appendChild(overlay);

    // Optional audio announcement
    if ("speechSynthesis" in window) {
      const utter = new SpeechSynthesisUtterance(`${playerName} wins with a Shanghai on hole ${hole}!`);
      utter.pitch = 1.3;
      utter.rate = 1;
      speechSynthesis.speak(utter);
    }

    // End game after short delay
    setTimeout(() => endGame(playerName), 1500);
  };
}


// ========== DISPLAY ==========

function updateScorecard() {
  const container = document.getElementById("scorecard");
  if (!container) return;

  let table = `<table class="scorecard-table">`;

  const renderSection = (label, start) => {
    const highlight = (currentHole >= start && currentHole < start + 9);
    table += `
      <tr><th colspan="12"${highlight ? ' style="background-color:#d2ffd2"' : ''}>🏌️ ${label}</th></tr>
      <tr>
        <th>Player</th>
        <th>HCP</th>
        ${[...Array(9)].map((_, i) => {
          const holeIndex = i + start - 1;
          const holeNumber = randomMode ? holeSequence[holeIndex] : i + start;
          if (advancedMode && hazardHoles.includes(holeNumber)) {
            return `<th title="Hazard Hole (${holeNumber})">⚠️</th>`;
          } else {
            return `<th>${holeNumber}</th>`;
          }
        }).join('')}
        <th>${label === "Front Nine" ? "Out" : "In"}</th>
      </tr>
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
      const total = scores.reduce((s, v) => s + (v ?? 0), 0); // raw subtotal only
      const isCompeting = competingNames.includes(p.name);

      const playerNameStyle = isSudden && !isCompeting
        ? 'text-decoration: line-through; color: gray'
        : '';

      table += `<tr>
        <td style="border: 1px solid #ccc; ${playerNameStyle}">${p.name}</td>
        <td style="border: 1px solid #ccc; text-align:center;">${p.handicap || 0}</td>
        ${
          scores.map((s, i) => {
            const holeIndex = i + start - 1;
            const holeNumberForCell = randomMode ? holeSequence[holeIndex] : (i + start);
            const isActive = holeNumberForCell === currentHole && p.name === players[currentPlayerIndex]?.name;

            const display = (s === undefined || s === null)
              ? (isSudden && !isCompeting ? "-" : "&nbsp;")
              : s; // raw score only, no handicap

            return `<td style="border: 1px solid #ccc; text-align:center;" class="hole-cell-${holeNumberForCell}${isActive ? ' active-cell' : ''}">${display}</td>`;
          }).join("")
        }
        <td style="border: 1px solid #ccc; text-align:center;"><strong>${scores.length === 9 ? total : ""}</strong></td>
      </tr>`;
    });
  };

  const renderSuddenDeath = () => {
    const maxHole = Math.max(...allPlayers.map(p => p.scores.length));
    const sdHoles = [];
    for (let i = 19; i <= maxHole; i++) {
      const label = i <= 20 ? i : (i - 20);
      sdHoles.push(label);
    }

    table += `<tr><th colspan="${sdHoles.length + 2}" class="sudden-death-header">🏌️ Sudden Death</th></tr>`;
    table += `<tr>
      <th class="sudden-death-header">Player</th>
      <th class="sudden-death-header">HCP</th>
      ${sdHoles.map(h => `<th class="sudden-death-header">${h}</th>`).join("")}
    </tr>`;

    const competingNames = players.map(p => p.name);

    const sortedPlayers = [...allPlayers].sort((a, b) => {
      const aIn = competingNames.includes(a.name);
      const bIn = competingNames.includes(b.name);
      return bIn - aIn; // Active players first
    });

    sortedPlayers.forEach(p => {
      const isTiedPlayer = competingNames.includes(p.name);
      const sdScores = p.scores.slice(18); // From hole 19 onward

      const nameCellStyle = isTiedPlayer
        ? 'class="sudden-death-cell"'
        : 'class="sudden-death-cell" style="text-decoration: line-through; color: gray"';

      table += `<tr class="sudden-death-row">
        <td ${nameCellStyle}>${p.name}</td>
        <td class="sudden-death-cell">${p.handicap || 0}</td>
      `;

      for (let i = 0; i < sdHoles.length; i++) {
        const holeNum = i + 19;
        const isActive = holeNum === currentHole && p.name === players[currentPlayerIndex]?.name;
        let cellContent = isTiedPlayer ? (sdScores[i] ?? "") : "–";

        table += `<td class="sudden-death-cell hole-cell-${holeNum}${isActive ? ' active-cell' : ''}">${cellContent}</td>`;
      }

      table += `</tr>`;
    });
  };

  const turnNumber = randomMode ? currentHoleIndex + 1 : currentHole;
  const allCompletedFront = allPlayers.every(p => p.scores.length >= 9);

  if (suddenDeath) renderSuddenDeath();

  if (turnNumber > 9 && allCompletedFront) {
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

  // Calculate gross and net for each player
  const sorted = [...players].map(p => {
    const grossTotal = p.scores.reduce((sum, s) => sum + (s ?? 0), 0);
    const netTotal = grossTotal + (p.handicap || 0); // handicap applied
    return {
      name: p.name,
      gross: grossTotal,
      net: netTotal
    };
  }).sort((a, b) => a.net - b.net); // sort by net score

  leaderboardDetails.innerHTML = `
    <ul class="leaderboard-list">
      ${sorted.map((p, i) => `
        <li${i === 0 ? ' class="first-place"' : ''}>
          <span>${p.name}</span>
          <span>Gross: ${p.gross} | Net: ${p.net}</span>
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

  const topLinks = document.querySelector(".top-links");
  if (topLinks) topLinks.style.display = "none";

  document.getElementById("setup").style.display = "none";
  document.getElementById("game").style.display = "block";
  const title = document.querySelector(".header-bar h1");
  if (title) title.style.display = "none";

  showHole();
  updateLeaderboard();
  updateScorecard();
  document.body.id = "gameStarted";
}

// ========== ADVANCED MODE ==========
function setupHazardHoles() {
  const allHoleIndices = [...Array(18).keys()];
  hazardHoles = allHoleIndices.sort(() => 0.5 - Math.random()).slice(0, 6);
}

function isAdjacent(number1, number2) {
  const dartboardOrder = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
  const idx = dartboardOrder.indexOf(number1);
  const prev = dartboardOrder[(idx - 1 + 20) % 20];
  const next = dartboardOrder[(idx + 1) % 20];
  return number2 === prev || number2 === next;
}

if (advancedMode && hazardHoles.includes(currentHole)) {
  const targetNumber = holeNumbers[currentHole];
  darts.forEach(dart => {
    if ((dart.type === 'D' || dart.type === 'T') && isAdjacent(targetNumber, dart.value)) {
      totalScore += 1;
      if (!player.hazardPenalties) player.hazardPenalties = [];
      player.hazardPenalties.push(currentHole); // or holeNumbers[currentHole]
    }
  });
}

function endGame() {
  gameStarted = false;

  const scoreInputs = document.getElementById("scoreInputs");
  if (!scoreInputs) {
    console.warn("scoreInputs container not found. Skipping stats and winner buttons.");
    return;
  }

  // Use the full player list as the baseline
  const fullPlayerList = JSON.parse(JSON.stringify(allPlayers));

  // Compute gross and net totals
  const totals = fullPlayerList.map(p => {
    const grossTotal = p.scores.reduce((sum, s) => sum + s, 0);
    const hcp = Number(p.handicap || 0);
    const netTotal = grossTotal + hcp; // lower is better
    return { ...p, grossTotal, netTotal, handicap: hcp };
  });

  // Decide winner by NET
  const winningNet = Math.min(...totals.map(t => t.netTotal));
  const winners = totals.filter(t => t.netTotal === winningNet);

  // Persist history (gross + net)
  const previousHistory = JSON.parse(localStorage.getItem(historyKey)) || [];
  previousHistory.push({
    date: new Date().toISOString(),
    players: totals.map(p => ({
      name: p.name,
      scores: [...p.scores],
      handicap: p.handicap || 0,
      grossTotal: p.grossTotal,
      netTotal: p.netTotal
    })),
    suddenDeath,
    advancedMode,
    randomMode
  });
  localStorage.setItem(historyKey, JSON.stringify(previousHistory));

  // Clear out old UI
  scoreInputs.innerHTML = "";

  // Winner / tie messaging
  if (winners.length === 1) {
    const w = winners[0];
    if (typeof showScoreAnimation === "function") {
      const hcpText = w.handicap >= 0 ? `+${w.handicap}` : `${w.handicap}`;
      showScoreAnimation(
        `${w.name} wins! Net ${w.netTotal} (Gross ${w.grossTotal} ${hcpText}) 🏆`,
        "#ffcc00"
      );
    }
    const winText = document.createElement("h2");
    winText.textContent = `${w.name} wins!!`;
    winText.style.color = "#ffff00";
    winText.style.textShadow = "1px 1px 4px black";
    scoreInputs.appendChild(winText);
  } else {
    const tieText = document.createElement("h2");
    tieText.textContent = `It's a tie! (${winners.map(w => w.name).join(", ")})`;
    tieText.style.color = "#ffff00";
    tieText.style.textShadow = "1px 1px 4px black";
    scoreInputs.appendChild(tieText);
  }

  // Add standard end-of-game buttons
  addEndGameButtons(scoreInputs);

  document.body.removeAttribute("id");
}


function clearHistory() {
  localStorage.removeItem(historyKey);
  alert("History cleared!");
}

function showStats() {
  const modal = document.getElementById("gameStatsModal");
  if (!modal) return;

  const statsContainer = document.getElementById("statsDetails");
  if (!statsContainer) return;

  // ✅ Ordered worst → best so display makes sense
  const scoreLabels = [
    "Buster",        // 8 strokes (worst)
    "Quad Bogey",    // 7 strokes
    "Triple Bogey",  // 6 strokes
    "Double Bogey",  // 5 strokes
    "Bogey",         // 4 strokes
    "Par",           // 3 strokes
    "Birdie",        // 2 strokes
    "Ace",           // 1 stroke
    "Goose Egg",     // 0
    "Icicle",        // -1
    "Polar Bear",    // -2
    "Frostbite",     // -3
    "Snowman",       // -4
    "Avalanche"      // -5 (best)
  ];

  const hitCounts = allPlayers.map(player => {
    const counts = Array(scoreLabels.length).fill(0);
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

// ✅ Mapping matches your actual numeric scores
function getHitsFromScore(score) {
  const map = {
    8: 0,    // Buster
    7: 1,    // Quad Bogey
    6: 2,    // Triple Bogey
    5: 3,    // Double Bogey
    4: 4,    // Bogey
    3: 5,    // Par
    2: 6,    // Birdie
    1: 7,    // Ace
    0: 8,    // Goose Egg
    [-1]: 9, // Icicle
    [-2]: 10,// Polar Bear
    [-3]: 11,// Frostbite
    [-4]: 12,// Snowman
    [-5]: 13 // Avalanche
  };
  return map[score] ?? -1;
}

// ========== MODALS ==========

function showModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove('hidden');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('hidden');
}


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

// ================= HISTORY FUNCTIONS =================

function initHistoryPage() {
  filterSelect = document.getElementById("playerFilter");
  container = document.getElementById("historyContainer");
  if (!filterSelect || !container) return;

  history = JSON.parse(localStorage.getItem(historyKey)) || [];
  const uniquePlayers = [...new Set(history.flatMap(game => game.players.map(p => p.name)))];

  filterSelect.innerHTML = '<option value="">-- All Players --</option>';
  uniquePlayers.sort().forEach(name => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    filterSelect.appendChild(option);
  });

  filterSelect.addEventListener("change", renderHistory);
  renderHistory();

  console.log("🎯 initHistoryPage running...");
  console.log("History:", history);
  console.log("Player Filter:", filterSelect);
  console.log("Parsed Names:", uniquePlayers);
}

function renderHistory() {
  container.innerHTML = "";
  const selected = filterSelect.value;

  const filtered = history.slice().reverse().filter(game =>
    !selected || game.players.some(p => p.name === selected)
  );

  if (filtered.length === 0) {
    container.innerHTML = "<p>No games match this filter.</p>";
    return;
  }

  filtered.forEach((game, index) => {
    const block = document.createElement("div");
    block.className = "history-block";

    const date = new Date(game.date).toLocaleString();
    const mode = game.advancedMode ? "Advanced" : "Standard";
    const sudden = game.suddenDeath ? " (Sudden Death)" : "";

    block.innerHTML = `<h3>Game ${history.length - index} – ${date} – ${mode}${sudden}</h3>`;

    const ul = document.createElement("ul");
    game.players.forEach(p => {
      if (!selected || p.name === selected) {
        const li = document.createElement("li");
        li.textContent = `${p.name}: ${p.total} (${p.scores.join(", ")})`;
        ul.appendChild(li);
      }
    });

    block.appendChild(ul);
    container.appendChild(block);
  });
}

function showHistory() {
  const historyModal = document.getElementById("historyModal");
  if (!historyModal) {
    console.warn("History modal not found");
    return;
  }

  // Show the modal
  historyModal.classList.remove("hidden");
  historyModal.style.display = "block";

  // Dim background if desired
  document.getElementById("shanghaiScreen")?.classList.add("dimmed"); 

  // Render the history inside the modal container
  const container = historyModal.querySelector(".history-container");
  if (container) {
    renderHistory(container);
  }
}

// Expose globally
window.showHistory = showHistory;


window.startGame = startGame;
window.showModal = showModal;
window.closeModal = closeModal;
window.showHistory = showHistory;
window.submitPlayerScore = submitPlayerScore;
window.undoHole = undoHole;

function addEndGameButtons(container) {
  // Leaderboard
  const leaderboardBtn = document.createElement("button");
  leaderboardBtn.innerText = "Leaderboard";
  leaderboardBtn.className = "button-leaderboard";
  leaderboardBtn.onclick = () => showModal("leaderboardModal");
  container.appendChild(leaderboardBtn);

  // Game Stats
  const statsBtn = document.createElement("button");
  statsBtn.innerText = "Game Stats";
  statsBtn.className = "button-stats";
  statsBtn.onclick = () => showStats();
  container.appendChild(statsBtn);

  // View History
  const historyBtn = document.createElement("button");
  historyBtn.innerText = "View History";
  historyBtn.className = "primary-button full-width";
  historyBtn.onclick = () => showHistory();
  container.appendChild(historyBtn);

  // Start New Round
  const startNewBtn = document.createElement("button");
  startNewBtn.innerText = "Start New Round";
  startNewBtn.className = "primary-button full-width";
  startNewBtn.onclick = () => {
    if (confirm("Select OK to start a new round with the same players? Cancel to select new players.")) {
      // --- NEW: remove any Shanghai UI before resetting ---
      if (typeof removeShanghaiDisplay === "function") {
        removeShanghaiDisplay();
      }

      players.unshift(players.pop());
      players.forEach(p => p.scores = []);
      allPlayers = JSON.parse(JSON.stringify(players));
      currentHole = 1;
      currentPlayerIndex = 0;
      suddenDeath = false;
      tiedPlayers = [];
      gameStarted = true;

      container.innerHTML = "";

      saveGameState();
      showHole();
      updateLeaderboard();
      updateScorecard();
    } else {
      location.reload();
    }
  };
  container.appendChild(startNewBtn);

  // Keep leaderboard visible
  const leaderboard = document.getElementById("leaderboard");
  if (leaderboard) {
    leaderboard.classList.remove("hidden");
    leaderboard.style.display = "block";
  }
}


// ========== EVENT LISTENERS ==========
document.addEventListener("DOMContentLoaded", () => {
  // History page init
  if (document.getElementById("playerFilter")) {
    initHistoryPage();
  }

  const select = document.getElementById("playerCount");
  if (!select) return;

  for (let i = 1; i <= 20; i++) {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = `${i} Player${i > 1 ? "s" : ""}`;
    select.appendChild(option);
  }

  document.getElementById("audioToggle")?.addEventListener("change", (e) => {
    audioEnabled = e.target.checked;
  });
  document.getElementById("randomToggle")?.addEventListener("change", (e) => {
    randomMode = e.target.checked;
  });
  document.getElementById("advancedToggle")?.addEventListener("change", (e) => {
    advancedMode = e.target.checked;
  });

  select.addEventListener("change", createPlayerInputs);

  document.getElementById("viewHistoryLink")?.addEventListener("click", (e) => {
  e.preventDefault();
  showHistory();
});

 const viewHistoryLink = document.getElementById("viewHistoryLink");
  if (viewHistoryLink) {
    console.log("🧷 View History listener attached"); // <== should log on page load
    viewHistoryLink.addEventListener("click", (e) => {
      e.preventDefault();
      console.log("🖱️ View History clicked"); // <== should log when clicked
      showHistory(); // <== should trigger your function
    });
  }

  requestAnimationFrame(() => {
    loadGameState?.();
  });
});

// Warn if game in progress on tab close
window.addEventListener("beforeunload", function (e) {
  const saved = localStorage.getItem("golfdartsState");
  if (saved) {
    e.preventDefault();
    e.returnValue = "";
  }
});
