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

// === env + storage keys (define once, near top) ===
(function () {
  if (typeof window.GD_ENV !== 'string') {
    const p = (location.pathname || '').toLowerCase();
    window.GD_ENV = /index2|script2|history2|style2|index3|script3|history3|style3/.test(p) ? 'ADE' : 'PROD';
  }
  if (!window.GD_KEYS || !window.GD_KEYS.games || !window.GD_KEYS.hof) {
    window.GD_KEYS = {
      games: `golfdarts_games_v2_${window.GD_ENV}`,
      hof:   `golfdarts_hof_v1_${window.GD_ENV}`
    };
  }
})();

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

  // Build hits options once (Miss → 1-BDP → 1..9)
  const hitsOptions =
    `<option value="miss">Miss!</option>
     <option value="bdp">1 - BDP</option>
     ${[...Array(9)].map((_, i) => `<option value="${i + 1}">${i + 1}</option>`).join("")}`;

  if (advancedMode && displayHole !== "🎯") {
    const advancedWrapper = document.createElement('div');
    advancedWrapper.className = 'advanced-inputs';

    // Player hits
    const playerGroup = document.createElement('div');
    playerGroup.className = 'input-group';
    playerGroup.innerHTML = `
      <label>${player.name} hits:</label>
      <select id="hits">
        ${hitsOptions}
      </select>
    `;
    advancedWrapper.appendChild(playerGroup);

    // Hazard hits (visible always; disabled on non-hazard holes)
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
    // Non-advanced or 🎯: single player hits dropdown centered
    const singleWrapper = document.createElement('div');
    singleWrapper.className = 'single-select';
    singleWrapper.innerHTML = `
      <label>${player.name} hits:</label>
      <select id="hits">
        ${hitsOptions}
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

function computeHoleScore({ hits, hazards, isHazardHole, advancedMode }) {
  // Clamp inputs
  const h  = Math.max(0, Math.min(9, Number(hits) || 0));
  const hz = Math.max(0, Math.min(3, Number(hazards) || 0));

  // Base table by hits:
  // 0→5, 1→3, 2→2, 3→1, 4→0, 5→-1, 6→-2, 7→-3, 8→-4, 9→-5
  const base = (h === 0) ? 5 : (4 - h);

  // Hazard penalty applies only on hazard holes in Advanced Mode
  const penalty = (advancedMode && isHazardHole) ? hz : 0;

  // Cap top end at 8 (Buster). Lower end naturally ≥ -5 from base table.
  return Math.min(8, base + penalty);
}

function submitPlayerScore() {
  const hitsValue = document.getElementById("hits").value;
  const isBDPSelected = hitsValue === "bdp";
  const hits = (hitsValue === "miss") ? 0 : (isBDPSelected ? 1 : parseInt(hitsValue, 10));

  if (isNaN(hits) || hits < 0 || hits > 9) {
    alert("Enter a valid number of hits.");
    return;
  }

  const player = players[currentPlayerIndex];
  if (!player) {
    console.warn("No current player found during score submission.");
    return;
  }

  // Shanghai prompt (unchanged)
  if (hits === 6) {
    const isShanghai = confirm(
      `Was this a Shanghai (1x, 2x, and 3x of ${currentHole})? ` +
      `Cancel to score -2 and return to game. OK to accept humiliating defeat`
    );
    if (isShanghai) {
      showShanghaiWin(player.name);
      return;
    }
  }

  // Hazards only matter on hazard holes in advanced mode
  let hazards = 0;
  if (advancedMode && hazardHoles.includes(currentHole)) {
    const hazardSelect = document.querySelector(".hazardSelect");
    hazards = hazardSelect ? (parseInt(hazardSelect.value, 10) || 0) : 0;
  }

  // Base score from hits
  // miss => 5 ; hits 1..9 => 4 - hits
  const base = (hits === 0) ? 5 : (4 - hits);

  // Final score: ALWAYS add hazards
  const score = base + hazards;

  // BDP only when user chose it AND it's truly a Par (hits=1 & hazards=0)
  const wasBDP = isBDPSelected && hits === 1 && hazards === 0;

  // Persist to both active and allPlayers mirrors
  const mirror = allPlayers.find(p => p.name === player.name);

  player.scores.push(score);
  if (mirror) mirror.scores.push(score);

  // Track hazards sum
  player.hazards = (player.hazards || 0) + hazards;
  if (mirror) mirror.hazards = (mirror.hazards || 0) + hazards;

  // Track BDP flags/count
  player.bdpFlags = player.bdpFlags || [];
  player.bdpFlags.push(!!wasBDP);
  if (wasBDP) player.bdpCount = (player.bdpCount || 0) + 1;

  if (mirror) {
    mirror.bdpFlags = mirror.bdpFlags || [];
    mirror.bdpFlags.push(!!wasBDP);
    if (wasBDP) mirror.bdpCount = (mirror.bdpCount || 0) + 1;
  }

  // For undo
  actionHistory.push({
    playerIndex: currentPlayerIndex,
    playerName: player.name,
    hole: currentHole,
    score,
    hazardAdded: hazards > 0,
    hazards,
    bdp: wasBDP
  });

  saveGameState();

  const { label, color } = getScoreLabelAndColor(score);

  // --- existing end-game & sudden death logic (unchanged) ---
  if (!suddenDeath && currentHole === 18 && currentPlayerIndex === players.length - 1) {
    const totals = players.map(p => p.scores.reduce((a, b) => a + b, 0));
    const lowest = Math.min(...totals);
    const tied = players.filter((p, i) => totals[i] === lowest);
    if (tied.length === 1) {
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

// Call this before resetting/starting a new round
// Call this before resetting/starting a new round or when opening Stats/Leaderboard from Shanghai
function removeShanghaiDisplay() {
  const bg = document.getElementById("shanghaiBackground");
  if (bg) {
    bg.querySelectorAll(".shanghai-overlay").forEach(el => el.remove());
    bg.style.display = "none";
    // If you set background via JS elsewhere, also clear it:
    // bg.style.backgroundImage = "";
  }
  document.body.classList.remove("shanghai-bg");
}


function showShanghaiWin(winnerName) {
  gameStarted = false;
  localStorage.removeItem("golfdartsState");

  let bg = document.getElementById("shanghaiBackground");
  if (!bg) {
    bg = document.createElement("div");
    bg.id = "shanghaiBackground";
    document.body.insertBefore(bg, document.body.firstChild);
  }

  bg.querySelectorAll(".shanghai-overlay").forEach(el => el.remove());

  const overlay = document.createElement("div");
  overlay.className = "shanghai-overlay";
  overlay.innerHTML = `
    <h1>SHANGHAI!!</h1>
    <h2>🏆 ${winnerName} WINS! 🏆</h2>
    <p class="shanghai-subtext">Single + Double + Triple on Hole ${currentHole}!</p>
    <div class="shanghai-buttons"></div>
  `;
  bg.appendChild(overlay);

      const btnContainer = overlay.querySelector(".shanghai-buttons");
  btnContainer.style.width = "min(520px, 90vw)";
  btnContainer.style.margin = "1rem auto 0";
  btnContainer.style.display = "flex";
  btnContainer.style.flexDirection = "column";

  // --- Game Stats ---
  const statsBtn = document.createElement("button");
  statsBtn.innerText = "Game Stats";
  statsBtn.className = "primary-button full-width";
  statsBtn.style.borderColor = "#ffcc00";
  statsBtn.style.marginTop = "0.25rem";
  statsBtn.onclick = () => showStats();
  btnContainer.appendChild(statsBtn);

    // --- Leaderboard ---
  const lbBtn = document.createElement("button");
  lbBtn.innerText = "Leaderboard";
  lbBtn.className = "button-leaderboard small-button full-width"; // match real button + force full width
  lbBtn.style.marginTop = "0.25rem";
  lbBtn.onclick = () => showModal('leaderboardModal'); // same as your in-game button
  btnContainer.appendChild(lbBtn);

  // --- Start New Round ---
  const startNewBtn = document.createElement("button");
  startNewBtn.innerText = "Start New Round";
  startNewBtn.className = "primary-button full-width";
  startNewBtn.style.marginTop = "0.25rem";
  startNewBtn.onclick = () => {
    if (confirm("Select OK to start a new round with the same players? Cancel to select new players.")) {
      players.unshift(players.pop());
      players.forEach(p => (p.scores = []));
      allPlayers = JSON.parse(JSON.stringify(players));
      currentHole = 1;
      currentPlayerIndex = 0;
      suddenDeath = false;
      tiedPlayers = [];
      gameStarted = true;

      document.getElementById("scoreInputs").innerHTML = "";
      removeShanghaiDisplay();
      saveGameState();
      showHole();
      updateLeaderboard();
      updateScorecard();
    } else {
      location.reload();
    }
  };
  btnContainer.appendChild(startNewBtn);

  bg.style.display = "block";
  document.body.classList.add("shanghai-bg");

  updateLeaderboard();
  updateScorecard();
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
          const isHaz = advancedMode && hazardHoles.includes(holeNumber);
          const thStyle = isHaz ? ' style="background-color:#fff4f5;"' : '';
          return `
            <th class="${isHaz ? 'hazard-col-header' : ''}"${thStyle}
                title="${isHaz ? `Hazard hole (${holeNumber})` : `Hole ${holeNumber}`}">
              <span class="hole-number">${holeNumber}</span>
            </th>`;
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
            const isHazardCol = advancedMode && hazardHoles.includes(holeNumberForCell);

            const display = (s === undefined || s === null)
              ? (isSudden && !isCompeting ? "-" : "&nbsp;")
              : s; // raw score only, no handicap

            const baseStyle = 'border: 1px solid #ccc; text-align:center;';
            const bg = isHazardCol ? ' background-color:#fff4f5;' : '';
            return `<td style="${baseStyle}${bg}"
                       class="hole-cell-${holeNumberForCell}${isActive ? ' active-cell' : ''}${isHazardCol ? ' hazard-col' : ''}">${display}</td>`;
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
      ${sdHoles.map(h => {
        const isHaz = advancedMode && h >= 1 && h <= 18 && hazardHoles.includes(h);
        const thStyle = isHaz ? ' style="background-color:#fff4f5;"' : '';
        return `
          <th class="sudden-death-header ${isHaz ? 'hazard-col-header' : ''}"${thStyle}
              title="${isHaz ? `Hazard hole (${h})` : `Hole ${h}`}">
            <span class="hole-number">${h}</span>
          </th>`;
      }).join("")}
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
        const label = holeNum <= 20 ? holeNum : (holeNum - 20);
        const isActive = holeNum === currentHole && p.name === players[currentPlayerIndex]?.name;
        const isHazCol = advancedMode && label >= 1 && label <= 18 && hazardHoles.includes(label);
        const baseStyle = 'text-align:center;';
        const bg = isHazCol ? ' background-color:#fff4f5;' : '';
        let cellContent = isTiedPlayer ? (sdScores[i] ?? "") : "–";

        table += `<td class="sudden-death-cell hole-cell-${holeNum}${isActive ? ' active-cell' : ''}${isHazCol ? ' hazard-col' : ''}" style="${baseStyle}${bg}">${cellContent}</td>`;
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
  const set = new Set();
  while (set.size < 6) {
    // pick numbers 1 through 18 (golf holes)
    set.add(Math.floor(Math.random() * 18) + 1);
  }
  hazardHoles = Array.from(set).sort((a, b) => a - b);
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

  // ✅ Clone full player list before any filtering
  const fullPlayerList = JSON.parse(JSON.stringify(allPlayers));

  // Determine winner if a single player remains
  let winner = null;
  if (players.length === 1) {
    winner = players[0];
  }

  // ✅ Restore full player list
  players = fullPlayerList;
  allPlayers = fullPlayerList;

  updateLeaderboard();
  updateScorecard();
  localStorage.removeItem("golfdartsState");

  // Save this game's results to local history
  const previousHistory = JSON.parse(localStorage.getItem(historyKey)) || [];
  const gameSummary = {
    date: new Date().toISOString(),
    players: allPlayers.map(p => ({
      name: p.name,
      scores: [...p.scores],
      total: p.scores.reduce((sum, s) => sum + s, 0),
    })),
    suddenDeath,
    advancedMode,
    randomMode
  };
  previousHistory.push(gameSummary);
  localStorage.setItem(historyKey, JSON.stringify(previousHistory));

  // Clear score input area
  scoreInputs.innerHTML = "";

  // Winner text
  if (winner) {
    const winText = document.createElement("h2");
    winText.textContent = `${winner.name} wins!!`;
    winText.style.color = "#ffff00";
    winText.style.textShadow = "1px 1px 4px black";
    scoreInputs.appendChild(winText);
  }

  // --- End-of-game buttons ---
  // Game Stats
  const statsBtn = document.createElement("button");
  statsBtn.innerText = "Game Stats";
  statsBtn.className = "primary-button full-width";
  statsBtn.style.borderColor = "#ffcc00";
  statsBtn.onclick = () => showStats();
  scoreInputs.appendChild(statsBtn);

  // Leaderboard
  const lbBtn = document.createElement("button");
  lbBtn.innerText = "Leaderboard";
  lbBtn.className = "primary-button full-width";
  lbBtn.onclick = () => {
    const leaderboard = document.getElementById("leaderboard");
    if (leaderboard) {
      leaderboard.classList.remove("hidden");
      leaderboard.style.display = "block";
      leaderboard.scrollIntoView({ behavior: "smooth" });
    }
  };
  scoreInputs.appendChild(lbBtn);

  // Start New Round
  const startNewBtn = document.createElement("button");
  startNewBtn.innerText = "Start New Round";
  startNewBtn.className = "primary-button full-width";
  startNewBtn.onclick = () => {
    if (confirm("Select OK to start a new round with the same players? Cancel to select new players.")) {
      // Rotate players: move last to front
      players.unshift(players.pop());
      players.forEach(p => (p.scores = []));
      allPlayers = JSON.parse(JSON.stringify(players));
      currentHole = 1;
      currentPlayerIndex = 0;
      suddenDeath = false;
      tiedPlayers = [];
      gameStarted = true;

      scoreInputs.innerHTML = "";
      saveGameState();
      showHole();
      updateLeaderboard();
      updateScorecard();
    } else {
      location.reload();
    }
  };
  scoreInputs.appendChild(startNewBtn);

  // ✅ Ensure leaderboard remains visible
  const leaderboard = document.getElementById("leaderboard");
  if (leaderboard) {
    leaderboard.classList.remove("hidden");
    leaderboard.style.display = "block";
  }

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

  // If player.hazards wasn't maintained, derive from actionHistory
  const hazardsFromHistory = (playerName) => {
    try {
      return (actionHistory || []).reduce((sum, a) =>
        sum + ((a.playerName === playerName && typeof a.hazards === "number") ? a.hazards : 0), 0
      );
    } catch {
      return 0;
    }
  };

  // Worst → best (matches your scoring map)
  const scoreLabels = [
    "Buster",        // 8
    "Quad Bogey",    // 7
    "Triple Bogey",  // 6
    "Double Bogey",  // 5
    "Bogey",         // 4
    "Par",           // 3  <-- BDP will be inserted right after this position
    "Birdie",        // 2
    "Ace",           // 1
    "Goose Egg",     // 0
    "Icicle",        // -1
    "Polar Bear",    // -2
    "Frostbite",     // -3
    "Snowman",       // -4
    "Avalanche"      // -5
  ];

  const hitCounts = (allPlayers || []).map(player => {
    const counts = Array(scoreLabels.length).fill(0);
    (player.scores || []).forEach(score => {
      const idx = getHitsFromScore(score);
      if (idx !== -1) counts[idx]++;
    });

    const bdpTotal = (typeof player.bdpCount === "number")
      ? player.bdpCount
      : ((player.bdpFlags || []).filter(Boolean).length);

    let hazardsTotal = (typeof player.hazards === "number") ? player.hazards : hazardsFromHistory(player.name);
    if (!Number.isFinite(hazardsTotal)) hazardsTotal = 0;

    return { name: player.name, counts, bdpTotal, hazardsTotal };
  });

  statsContainer.innerHTML = hitCounts.map(p => {
    const lines = [];

    // Hazards first — only if > 0
    if (p.hazardsTotal > 0) lines.push(`<li>${p.hazardsTotal} Hazards</li>`);

    // Score breakdown in order, inserting BDP after "Par"
    for (let i = 0; i < scoreLabels.length; i++) {
      const label = scoreLabels[i];
      const count = p.counts[i];

      // Normal score label (omit zeros)
      if (count > 0) lines.push(`<li>${count} ${label}</li>`);

      // Immediately after "Par", show BDP if > 0
      if (label === "Par" && p.bdpTotal > 0) {
        lines.push(`<li>${p.bdpTotal} BDP</li>`);
      }
    }

    return `<strong>${p.name}</strong><ul>${lines.join("")}</ul>`;
  }).join("<hr>");

  // Open the modal (use your existing show logic if different)
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
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}

// --- Close on outside click (clicking the overlay, not the card) ---
document.addEventListener('click', (e) => {
  // Find any open modal(s)
  const openModals = Array.from(document.querySelectorAll('.modal-overlay:not(.hidden)'));
  if (openModals.length === 0) return;

  // For each open modal, close if the click was on the overlay area (outside .modal-content)
  openModals.forEach((overlay) => {
    const content = overlay.querySelector('.modal-content');
    if (!content) return;

    // If click target is the overlay itself, or within overlay but NOT inside content, then close
    const clickedInsideContent = content.contains(e.target);
    const clickedInsideOverlay = overlay.contains(e.target);

    if (clickedInsideOverlay && !clickedInsideContent) {
      closeModal(overlay.id);
    }
  });
});


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

// ===== HOF CONFIG & HELPERS =====

// Detect environment for storage segregation
const GD_ENV = (function () {
  // Tweak this if you prefer a different ADE detection
  const path = (window.location.pathname || '').toLowerCase();
  if (path.includes('index2') || path.includes('script2') || path.includes('history2') || path.includes('style2')) return 'ADE';
  return 'PROD';
})();

const GD_KEYS = {
  games: `golfdarts_games_v2_${GD_ENV}`,
  hof:   `golfdarts_hof_v1_${GD_ENV}`,
};

// Modes normalized
const GD_MODES = {
  STANDARD: 'standard',
  RANDOM: 'random',
  ADVANCED: 'advanced',
};

// Categories we support in HOF
const HOF_CATEGORIES = {
  BEST_18: 'best18',
  BEST_FRONT9: 'bestFront9',
  BEST_BACK9: 'bestBack9',
  BEST_SUDDEN_DEATH: 'bestSuddenDeath',
  MOST_X: 'mostX',
  SHANGHAIS: 'shanghais',
};

// “X” metrics we’ll consider for “Most X”
const MOST_X_KEYS = [
  'hazardsTotal','busters','quadBogeys','tripleBogeys','doubleBogeys','bogeys',
  'pars','bdp','birdies','aces',
  'gooseEgg','icicle','polarBear','frostbite','snowman','avalanche'
];

// Load/save utilities
function gdLoad(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch { return fallback; }
}
function gdSave(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// Safe date stamp MM/DD/YY
function mmddyy(ts) {
  const d = new Date(ts);
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${mm}/${dd}/${yy}`;
}

// Deep clone small objects
const clone = (o) => JSON.parse(JSON.stringify(o || {}));

// ===== PERSIST GAME & REFRESH HOF =====
function finalizeGameAndUpdateHof(finalGamePayload) {
  const game = finalGamePayload || {};
  if (!game.timestamp) game.timestamp = Date.now();
  if (!game.id)        game.id = `g${game.timestamp}`;
  if (!game.mode)      game.mode = 'standard';

  const games = gdLoad(GD_KEYS.games, []);
  games.push(game);
  gdSave(GD_KEYS.games, games);

  const hof = gdLoad(GD_KEYS.hof, { version: 1, updated: 0, categories: {} });
  updateHofWithGame(hof, game);
  hof.updated = Date.now();
  gdSave(GD_KEYS.hof, hof);

  if (!document.getElementById('hofModal')?.classList.contains('hidden')) {
    renderHof({ tab: window.__hofTab || 'global' });
  }
}

function ensureCat(hof, key) {
  if (!hof.categories[key]) hof.categories[key] = { entries: [] };
  return hof.categories[key];
}

function entryBase(p, game) {
  return {
    player: String(p?.name || '').trim(),
    date: mmddyy(game.timestamp),
    ts: Number(game.timestamp) || Date.now(),
    mode: game.mode || 'standard',
    gameId: game.id
  };
}

// keeps top-N by metric; de-dupes same player+metric(+subtype) with latest ts winning
function insertRanked(list, candidate, compareFn, maxLen = 25) {
  const cand = candidate || {};
  const keyPlayer  = String(cand.player || '').trim();
  const keyMetric  = Number(cand.metric) || 0;
  const keySubtype = (cand.subtype ?? null);
  const keyTs      = Number(cand.ts) || 0;

  const idx = list.findIndex(e =>
    String(e?.player || '').trim() === keyPlayer &&
    (Number(e?.metric) || 0) === keyMetric &&
    (e?.subtype ?? null) === keySubtype
  );

  if (idx >= 0) {
    if (keyTs >= (Number(list[idx].ts) || 0)) list.splice(idx, 1);
    else return;
  }

  list.push({ ...cand, player: keyPlayer, metric: keyMetric, ts: keyTs, subtype: keySubtype });
  list.sort(compareFn);
  if (list.length > maxLen) list.length = maxLen;
}

// comparators (latest ts breaks ties on metric)
const ascByMetricLatestWins  = (a, b) => ( (a.metric||0) - (b.metric||0) ) || ( (b.ts||0) - (a.ts||0) );
const descByMetricLatestWins = (a, b) => ( (b.metric||0) - (a.metric||0) ) || ( (b.ts||0) - (a.ts||0) );

// deps: entryBase, HOF_CATEGORIES, MOST_X_KEYS, prettyX
function buildPlayerCandidates(p, game) {
  const out = [];
  const base = entryBase(p, game);

  const totals = Array.isArray(p.perHoleTotals) ? p.perHoleTotals : [];
  const front9 = totals.slice(0, 9).reduce((a, b) => a + (Number(b) || 0), 0);
  const back9  = totals.slice(9, 18).reduce((a, b) => a + (Number(b) || 0), 0);
  const total  = Number(p.total) || 0;

  out.push({ ...base, category: HOF_CATEGORIES.BEST_18,     metric: total,  label: 'Best 18' });
  out.push({ ...base, category: HOF_CATEGORIES.BEST_FRONT9, metric: front9, label: 'Best Front 9' });
  out.push({ ...base, category: HOF_CATEGORIES.BEST_BACK9,  metric: back9,  label: 'Best Back 9' });

  if (p.suddenDeath?.won) {
    out.push({
      ...base,
      category: HOF_CATEGORIES.BEST_SUDDEN_DEATH,
      metric: total,
      label: 'Best Sudden Death',
      extra: { extraHoles: Number(p.suddenDeath.extraHoles) || 0 }
    });
  }

  const s = p.stats || {};
  for (let i = 0; i < MOST_X_KEYS.length; i++) {
    const k = MOST_X_KEYS[i];
    const count = Number(s[k] || 0);
    if (count > 0) {
      out.push({
        ...base,
        category: HOF_CATEGORIES.MOST_X,
        subtype: k,
        metric: count,
        label: `Most ${prettyX(k)}`
      });
    }
  }

  const sh = s.shanghais;
  const shCount = Number(sh?.count || 0);
  if (shCount > 0) {
    out.push({
      ...base,
      category: HOF_CATEGORIES.SHANGHAIS,
      metric: shCount,
      label: 'Shanghais',
      extra: { holes: Array.isArray(sh?.holes) ? sh.holes.slice(0) : [] }
    });
  }

  return out;
}

// Translate stat keys to friendly labels
function prettyX(k) {
  const map = {
    hazardsTotal: 'Hazards', busters: 'Busters', quadBogeys: 'Quad Bogeys',
    tripleBogeys: 'Triple Bogeys', doubleBogeys: 'Double Bogeys', bogeys: 'Bogeys',
    pars: 'Pars', bdp: 'BDP', birdies: 'Birdies', aces: 'Aces',
    gooseEgg: 'Goose Egg', icicle: 'Icicle', polarBear: 'Polar Bear',
    frostbite: 'Frostbite', snowman: 'Snowman', avalanche: 'Avalanche'
  };
  return map[k] || k;
}

function updateHofWithGame(hof, game) {
  const catBest18   = ensureCat(hof, HOF_CATEGORIES.BEST_18);
  const catFront9   = ensureCat(hof, HOF_CATEGORIES.BEST_FRONT9);
  const catBack9    = ensureCat(hof, HOF_CATEGORIES.BEST_BACK9);
  const catBestSD   = ensureCat(hof, HOF_CATEGORIES.BEST_SUDDEN_DEATH);
  const catMostX    = ensureCat(hof, HOF_CATEGORIES.MOST_X);
  const catShanghai = ensureCat(hof, HOF_CATEGORIES.SHANGHAIS);

  (game.players || []).forEach(p => {
    const pcs = buildPlayerCandidates(p, game);
    pcs.forEach(c => {
      c.mode = game.mode || 'standard';
      c.metricLabel = c.label;

      if (c.category === HOF_CATEGORIES.BEST_18) {
        c.metricType = 'asc'; c.metricName = 'total'; c.subtype = '18';
        c.metric = Number(c.metric) || 0; c.valueText = String(c.metric);
        insertRanked(catBest18.entries, c, ascByMetricLatestWins, 25);

      } else if (c.category === HOF_CATEGORIES.BEST_FRONT9) {
        c.metricType = 'asc'; c.subtype = 'front9';
        c.metric = Number(c.metric) || 0; c.valueText = String(c.metric);
        insertRanked(catFront9.entries, c, ascByMetricLatestWins, 25);

      } else if (c.category === HOF_CATEGORIES.BEST_BACK9) {
        c.metricType = 'asc'; c.subtype = 'back9';
        c.metric = Number(c.metric) || 0; c.valueText = String(c.metric);
        insertRanked(catBack9.entries, c, ascByMetricLatestWins, 25);

      } else if (c.category === HOF_CATEGORIES.BEST_SUDDEN_DEATH) {
        c.metricType = 'asc'; c.subtype = 'suddenDeath';
        c.metric = Number(c.metric) || 0; c.valueText = String(c.metric);
        insertRanked(catBestSD.entries, c, ascByMetricLatestWins, 25);

      } else if (c.category === HOF_CATEGORIES.MOST_X) {
        c.metricType = 'desc';
        c.metric = Number(c.metric) || 0; c.valueText = String(c.metric);
        insertRanked(catMostX.entries, c, descByMetricLatestWins, 25);

      } else if (c.category === HOF_CATEGORIES.SHANGHAIS) {
        c.metricType = 'desc';
        c.metric = Number(c.metric) || 0; c.valueText = String(c.metric);
        insertRanked(catShanghai.entries, c, descByMetricLatestWins, 25);
      }
    });
  });
}

function computeRanksWithTies(sortedEntries /* 'asc' | 'desc' */) {
  const out = [];
  let rank = 0, seen = 0, prevMetric, hasPrev = false;

  for (let i = 0; i < sortedEntries.length; i++) {
    const e = sortedEntries[i];
    const m = e?.metric;
    seen += 1;

    if (!hasPrev || m !== prevMetric) {
      rank = seen;
      prevMetric = m;
      hasPrev = true;
    }
    out.push({ rank, entry: e });
  }
  return out;
}

function filterByMode(entries, mode /* 'all' | 'standard' | 'random' | 'advanced' */) {
  if (!mode || mode === 'all') return entries;
  const m = String(mode).toLowerCase();
  return entries.filter(e => (e.mode || '').toLowerCase() === m);
}

function filterByPlayer(entries, name) {
  if (!name) return entries;
  const q = String(name).trim().toLowerCase();
  if (!q) return entries;
  return entries.filter(e => (e.player || '').toLowerCase().includes(q));
}

function getHofData() {
  const d = gdLoad(GD_KEYS.hof, null) || { version: 1, updated: 0, categories: {} };
  if (!d.categories || typeof d.categories !== 'object') d.categories = {};
  return d;
}

function pickList(catKey) {
  const hof = getHofData();
  const cat = hof && hof.categories && hof.categories[catKey];
  const entries = Array.isArray(cat?.entries) ? cat.entries.slice() : [];
  return entries.sort((a, b) =>
    ((a?.metricType || 'asc') === 'asc')
      ? ascByMetricLatestWins(a, b)
      : descByMetricLatestWins(a, b)
  );
}

function renderHof(options = {}) {
  const tab = options.tab || (window.__hofTab || 'global');
  window.__hofTab = tab;

  if (tab === 'player' && typeof populateHofPlayerDropdown === 'function') {
    try { populateHofPlayerDropdown(); } catch {}
  }

  const modeFilter   = options.mode   || (document.getElementById('hofModeFilter')?.value   || 'all');
  const playerFilter = options.player || (document.getElementById('hofPlayerFilter')?.value || '');

  // show/hide filters (kept here to match current wiring)
  const $mode = document.getElementById('hofModeFilter');
  const $player = document.getElementById('hofPlayerFilter');
  if ($mode)   $mode.style.display   = (tab === 'mode')   ? '' : 'none';
  if ($player) $player.style.display = (tab === 'player') ? '' : 'none';

  const blocks = [
    { key: HOF_CATEGORIES.BEST_18,           title: 'Best 18',            limitGlobal: 10 },
    { key: HOF_CATEGORIES.BEST_FRONT9,       title: 'Best Front 9',       limitGlobal: 10 },
    { key: HOF_CATEGORIES.BEST_BACK9,        title: 'Best Back 9',        limitGlobal: 10 },
    { key: HOF_CATEGORIES.BEST_SUDDEN_DEATH, title: 'Best Sudden Death',  limitGlobal: 10 },
    { key: HOF_CATEGORIES.MOST_X,            title: 'Most X (per round)', limitGlobal: 10 },
    { key: HOF_CATEGORIES.SHANGHAIS,         title: 'Shanghais',          limitGlobal: 10 },
  ];

  const container = document.getElementById('hofContent');
  if (!container) return;

  container.innerHTML = blocks.map(({ key, title, limitGlobal }) => {
    let entries = pickList(key);
    if (tab === 'mode')   entries = filterByMode(entries, modeFilter);
    if (tab === 'player') entries = filterByPlayer(entries, playerFilter);

    const limit = (tab === 'global') ? limitGlobal : 25;
    entries = entries.slice(0, limit);

    const ranked = computeRanksWithTies(entries);

    const rows = ranked.map(({ rank, entry }) => {
      const name = entry.player || '';
      const score = entry.metric ?? '';
      const date = entry.date || '';
      const modeTxt = (entry.mode === 'standard' || !entry.mode)
        ? ''
        : ` • ${entry.mode[0].toUpperCase()}${entry.mode.slice(1)}`;

      let note = '';
      if (entry.category === HOF_CATEGORIES.BEST_SUDDEN_DEATH) {
        const xh = entry?.extra?.extraHoles || 0;
        note = ` • SD +${xh}`;
      } else if (entry.category === HOF_CATEGORIES.MOST_X) {
        note = ` • ${prettyX(entry.subtype)}`;
      } else if (entry.category === HOF_CATEGORIES.SHANGHAIS) {
        const holes = entry?.extra?.holes?.length ? ` on ${entry.extra.holes.join(',')}` : '';
        note = ` • ${entry.metric}×${holes}`;
      }

      return `
        <div style="display:flex; gap:8px; align-items:center; justify-content:space-between; padding:6px 10px; border-bottom:1px solid rgba(255,255,255,0.2);">
          <div style="min-width:28px; font-weight:700;">${rank}</div>
          <div style="flex:1 1 auto;"><strong>${name}</strong></div>
          <div style="min-width:60px; text-align:right;">${score}</div>
          <div style="min-width:120px; text-align:right; opacity:0.9;">${date}${modeTxt}${note}</div>
        </div>
      `;
    }).join('') || `<div style="opacity:0.8; padding:6px 10px;">No results yet.</div>`;

    return `
      <div style="margin-bottom:14px; border:1px solid rgba(255,255,255,0.25); border-radius:12px; overflow:hidden;">
        <div style="background:rgba(0,0,0,0.25); padding:8px 10px; font-weight:700;">${title}</div>
        <div>${rows}</div>
      </div>
    `;
  }).join('');
}

// define after renderHof() and populateHofPlayerDropdown()
function openHof() {
  try {
    if (typeof populateHofPlayerDropdown === 'function') populateHofPlayerDropdown();
    renderHof({ tab: 'global' });
  } catch (e) {
    console.warn('[HOF] render on open failed', e);
  }
  showModal('hofModal');
}
// ensure global access for inline onclick
window.openHof = openHof;

// HOF controls wiring (single source of truth)
(function () {
  const controls  = document.getElementById('hofControls');
  if (!controls) return;

  const modeSel   = document.getElementById('hofModeFilter');
  const playerSel = document.getElementById('hofPlayerFilter');

  function setTab(tab) {
    window.__hofTab = tab;

    controls.querySelectorAll('.tab-btn')
      .forEach(b => b.classList.toggle('is-active', b.getAttribute('data-hof-tab') === tab));

    if (modeSel)   modeSel.style.display   = (tab === 'mode')   ? '' : 'none';
    if (playerSel) playerSel.style.display = (tab === 'player') ? '' : 'none';

    if (tab === 'player' && typeof populateHofPlayerDropdown === 'function') {
      try { populateHofPlayerDropdown(); } catch {}
    }

    renderHof({ tab });
  }

  controls.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-hof-tab]');
    if (!btn || !controls.contains(btn)) return;
    e.preventDefault();
    const tab = btn.getAttribute('data-hof-tab');
    if (tab) setTab(tab);
  });

  if (modeSel)   modeSel.addEventListener('change', () => setTab('mode'));
  if (playerSel) playerSel.addEventListener('change', () => setTab('player'));

  if (!window.__hofTab) setTab('global');
})();

// === HOF integration: finder/diagnostic ===
(function hofFinder() {
  const suspects = [
    'finalizeGame', 'finaliseGame', 'completeGame', 'endGame',
    'onGameComplete', 'showGameStats', 'renderGameStats', 'openGameStats'
  ];

  const found = suspects.filter(name => typeof window[name] === 'function');

  const clues = {
    gameStatsBtn: !!document.querySelector('#gameStatsBtn, .game-stats-btn, button[data-role="game-stats"]'),
    gameStatsModal: !!document.getElementById('gameStatsModal'),
    submitScoreBtn: !!document.getElementById('submitScoreBtn'),
  };

  console.log('[HOF] Finder:', { foundFunctions: found, clues });

  // Optionally enable one of the following:
  // found.forEach(name => wrapWithHofFinalize(name));
  // if (clues.gameStatsBtn) wrapClickToFinalize(document.querySelector('#gameStatsBtn, .game-stats-btn, button[data-role="game-stats"]'));
})();

function wrapWithHofFinalize(fnName) {
  const orig = window[fnName];
  if (typeof orig !== 'function' || orig.__hofWrapped) return;

  function after() {
    try {
      const payload = buildFinalGamePayloadFromState(window.gameState || {});
      finalizeGameAndUpdateHof(payload);
      console.log(`[HOF] finalize called after ${fnName}`);
    } catch (e) {
      console.warn(`[HOF] finalize failed after ${fnName}`, e);
    }
  }

  window[fnName] = function (...args) {
    const ret = orig.apply(this, args);
    try {
      if (ret && typeof ret.then === 'function') ret.finally(after);
      else after();
    } catch {
      after();
    }
    return ret;
  };
  window[fnName].__hofWrapped = true;
}

function wrapClickToFinalize(btn) {
  if (!btn || btn.__hofWrapped) return;

  const handler = () => {
    try {
      const payload = buildFinalGamePayloadFromState(window.gameState || {});
      finalizeGameAndUpdateHof(payload);
      console.log('[HOF] finalize called from gameStatsBtn click');
    } catch (e) {
      console.warn('[HOF] finalize failed from gameStatsBtn click', e);
    }
  };

  btn.addEventListener('click', handler, { once: true });
  btn.__hofWrapped = true;
}

// observe #gameStatsModal opening to persist HOF once per open
(function persistHofWhenStatsOpen() {
  const modal = document.getElementById('gameStatsModal');
  if (!modal) {
    console.warn('[HOF] #gameStatsModal not found; skipping modal observer');
    return;
  }

  let persistedForThisOpen = false;

  function tryPersist() {
    if (persistedForThisOpen) return;
    try {
      const payload = buildFinalGamePayloadFromState(window.gameState || {});
      finalizeGameAndUpdateHof(payload);
      console.log('[HOF] finalize called when Game Stats opened');
      persistedForThisOpen = true;
    } catch (e) {
      console.warn('[HOF] finalize failed when Game Stats opened', e);
    }
  }

  const obs = new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === 'attributes' && m.attributeName === 'class') {
        const isHidden = modal.classList.contains('hidden');
        if (!isHidden) tryPersist();
        else persistedForThisOpen = false;
      }
    }
  });

  obs.observe(modal, { attributes: true, attributeFilter: ['class'] });
})();

function getAllPlayersFromGames() {
  const names = new Set();

  // in-memory
  const gs = window.gameState || {};
  if (Array.isArray(gs.players)) {
    if (typeof gs.players[0] === 'string') gs.players.forEach(n => n && names.add(String(n).trim()));
    else if (gs.players[0]?.name)          gs.players.forEach(p => p?.name && names.add(String(p.name).trim()));
  }

  const safeParse = (raw) => { try { return JSON.parse(raw); } catch { return null; } };
  const pullV2 = (arr) => {
    (arr || []).forEach(g => (g.players || []).forEach(p => {
      const n = (p?.name || '').trim();
      if (n) names.add(n);
    }));
  };

  // current env games v2
  try { pullV2(gdLoad(GD_KEYS.games, [])); } catch {}

  // other env games v2
  try {
    const otherEnv = (GD_ENV === 'ADE') ? 'PROD' : 'ADE';
    pullV2(gdLoad(`golfdarts_games_v2_${otherEnv}`, []));
  } catch {}

  // legacy keys
  [
    'golfdarts_history', 'golfdarts_history_ADE', 'golfdarts_history_PROD',
    'golfdarts_games',   'golfdarts_games_ADE',   'golfdarts_games_PROD'
  ].forEach(k => {
    const parsed = safeParse(localStorage.getItem(k));
    if (!parsed) return;

    if (Array.isArray(parsed?.records)) {
      parsed.records.forEach(r => {
        const arr = r?.players;
        if (!Array.isArray(arr)) return;
        if (typeof arr[0] === 'string') arr.forEach(n => n && names.add(String(n).trim()));
        else if (arr[0]?.name)          arr.forEach(p => p?.name && names.add(String(p.name).trim()));
      });
    }

    if (Array.isArray(parsed)) {
      parsed.forEach(r => {
        const arr = r?.players;
        if (!Array.isArray(arr)) return;
        if (typeof arr[0] === 'string') arr.forEach(n => n && names.add(String(n).trim()));
        else if (arr[0]?.name)          arr.forEach(p => p?.name && names.add(String(p.name).trim()));
      });
    }
  });

  return Array.from(names)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

function populateHofPlayerDropdown() {
  const sel = document.getElementById('hofPlayerFilter');
  if (!sel) return;

  const current = sel.value;
  const players = getAllPlayersFromGames();

  const frag = document.createDocumentFragment();
  const first = document.createElement('option');
  first.value = '';
  first.textContent = 'All Players';
  frag.appendChild(first);

  for (let i = 0; i < players.length; i++) {
    const opt = document.createElement('option');
    opt.value = players[i];
    opt.textContent = players[i];
    frag.appendChild(opt);
  }

  sel.innerHTML = '';
  sel.appendChild(frag);

  if ([...sel.options].some(o => o.value === current)) sel.value = current;
}


// expose globals (place after renderHof and populateHofPlayerDropdown are defined)
window.showHistory = showHistory;
window.startGame = startGame;
window.showModal = showModal;
window.closeModal = closeModal;
window.submitPlayerScore = submitPlayerScore;
window.undoHole = undoHole;
window.showHole = showHole;

window.openHof = function () {
  try {
    if (typeof populateHofPlayerDropdown === 'function') populateHofPlayerDropdown();
    renderHof({ tab: 'global' });
  } catch (e) {
    console.warn('[HOF] render on open failed', e);
  }
  showModal('hofModal');
};

// ========== EVENT LISTENERS ==========
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('playerFilter')) {
    initHistoryPage();
  }

  const select = document.getElementById('playerCount');
  if (select) {
    // build options 1..20 once
    select.innerHTML = '';
    for (let i = 1; i <= 20; i++) {
      const option = document.createElement('option');
      option.value = i;
      option.textContent = `${i} Player${i > 1 ? 's' : ''}`;
      select.appendChild(option);
    }
    select.addEventListener('change', createPlayerInputs);
  }

  const audio = document.getElementById('audioToggle');
  if (audio) audio.addEventListener('change', (e) => { audioEnabled = !!e.target.checked; });

  const random = document.getElementById('randomToggle');
  if (random) random.addEventListener('change', (e) => { randomMode = !!e.target.checked; });

  const adv = document.getElementById('advancedToggle');
  if (adv) adv.addEventListener('change', (e) => { advancedMode = !!e.target.checked; });

  const viewHistoryLink = document.getElementById('viewHistoryLink');
  if (viewHistoryLink) {
    viewHistoryLink.addEventListener('click', (e) => {
      e.preventDefault();
      showHistory();
    });
  }

  requestAnimationFrame(() => {
    if (typeof loadGameState === 'function') loadGameState();
  });
});

window.addEventListener('beforeunload', (e) => {
  const saved = localStorage.getItem('golfdartsState');
  if (saved) {
    e.preventDefault();
    e.returnValue = '';
  }
});

