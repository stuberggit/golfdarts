let players = [];
let currentHole = 1;
let currentPlayerIndex = 0;

function createPlayerInputs() {
  const count = parseInt(document.getElementById("playerCount").value);
  if (count < 1 || count > 20) return alert("Enter 1 to 20 players.");

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
      <label>Player ${i + 1}:
        <select id="${selectId}" onchange="handleNameDropdown('${selectId}', '${inputId}')">
          <option value="" disabled selected>Select Player</option>
${playerOptions.map(name => `<option value="${name}">${name}</option>`).join('')}

        </select>
        <input type="text" id="${inputId}" placeholder="Enter name" style="display:none;">
      </label><br>
    `;
  }

  document.getElementById("startBtn").style.display = "inline";
}

function handleNameDropdown(selectId, inputId) {
  const select = document.getElementById(selectId);
  const input = document.getElementById(inputId);

  if (select.value === "Other") {
    input.style.display = "inline";
    input.focus();
  } else {
    input.style.display = "none";
  }
}

function startGame() {
  const count = parseInt(document.getElementById("playerCount").value);
  players = [];

  for (let i = 0; i < count; i++) {
    const select = document.getElementById(`select-${i}`);
    const input = document.getElementById(`name-${i}`);
    const name = select.value === "Other" ? input.value.trim() : select.value;
    players.push({ name: name || `Player ${i + 1}`, scores: [] });
    if (!name) return alert(`Player ${i + 1} must have a name.`);

  }

  document.getElementById("setup").style.display = "none";
  document.getElementById("game").style.display = "block";

  currentPlayerIndex = 0;
  showHole();
  updateLeaderboard();
}

function showHole() {
  document.getElementById("holeHeader").innerText = `Hole ${currentHole}`;
  const container = document.getElementById("scoreInputs");
  container.innerHTML = "";

  const player = players[currentPlayerIndex];

  container.innerHTML = `
    <label>${player.name} hits:
      <select id="hits">
        <option value="5">Miss!</option>
        ${[...Array(9)].map((_, i) => `<option value="${i + 1}">${i + 1}</option>`).join("")}
      </select>
    </label><br>
  `;

  const dartboard = document.getElementById("dartboardImage");
  if (dartboard) {
    dartboard.src = `images/dartboard-${currentHole}.png`;
  }
}


function getScore(hits) {
  if (hits === 0) return 5; // double bogey
  const scores = [3, 2, 1, 0, -1, -2, -3, -4, -5];
  return hits >= 1 && hits <= 9 ? scores[hits - 1] : 5;
}

function getScoreLabelAndColor(hits) {
  const labels = [
    "Double Bogey", "Par", "Birdie", "Ace", "Goose Egg", "Icicle",
    "Polar Bear", "Frostbite", "Snowman", "Avalanche"
  ];
  const colors = [
    "#c00", "#222", "#3c6", "#08f", "#888", "#0cc",
    "#06c", "#339", "#446", "#113"
  ];

  if (hits >= 0 && hits <= 9) {
    return { label: labels[hits], color: colors[hits] };
  } else {
    return { label: "Unknown", color: "#000" };
  }
}

function submitPlayerScore() {
  const hits = parseInt(document.getElementById("hits").value);
  if (isNaN(hits) || hits < 0 || hits > 9) return alert("Enter 0 to 9 darts hit.");

  const score = getScore(hits);
  const player = players[currentPlayerIndex];
  player.scores.push(score);

  const { label, color } = getScoreLabelAndColor(hits);
  showScoreAnimation(`${player.name}: ${label}!`, color);

  // ✅ Update leaderboard immediately after this player's score is submitted
  updateLeaderboard();

  currentPlayerIndex++;

  if (currentPlayerIndex >= players.length) {
    // End of hole
    if (currentHole < 18) {
      currentHole++;
      currentPlayerIndex = 0;
      showHole();
    } else {
      updateLeaderboard(true);
      document.getElementById("scoreInputs").innerHTML = "<h2>Game complete!</h2>";
    }
  } else {
    showHole();
  }
}


function updateLeaderboard(final = false) {
  let table = `<table class="leaderboard-table">`;

  // Front Nine Header
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

  // Back Nine Header
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

  // Final Total
  table += `<tr><th colspan="11">⛳ Total</th></tr><tr><th>Player</th><td colspan="10">`;

  table += `<ul class="total-list">`;
  players.forEach(player => {
    const total = player.scores.reduce((sum, s) => sum + (s ?? 0), 0);
    table += `<li><strong>${player.name}:</strong> ${player.scores.length === 18 ? total : "-"}</li>`;
  });
  table += `</ul></td></tr>`;

  table += `</table>`;

  document.getElementById("leaderboard").innerHTML = final
    ? `<h2>🏆 Final Leaderboard</h2>${table}`
    : table;
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
  showHole();
  updateLeaderboard();
}

function showScoreAnimation(message, color = "#0a3") {
  const el = document.getElementById("scoreAnimation");
  if (!el) return;
  el.style.color = color;
  el.innerText = message;
  el.style.animation = "none";
  void el.offsetWidth;
  el.style.animation = "popIn 0.6s ease-out";
  setTimeout(() => el.innerText = "", 1000);
}

window.onbeforeunload = function () {
  return "Are you sure you want to leave? Your game progress will be lost.";
};
