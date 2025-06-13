let players = [];
let currentHole = 1;


function createPlayerInputs() {
  const count = parseInt(document.getElementById("playerCount").value);
  if (count < 1 || count > 20) return alert("Enter 1 to 20 players.");

  const playerOptions = [
    "Brandon", "Brock", "Dan", "Deanna", "Derrick", "Don", "Edgar", 
    "Erin", "Mullins", "Phillip", "Pusti", "Stuberg", "Tara", "Other"
  ];

  const container = document.getElementById("nameInputs");
  container.innerHTML = "";

  for (let i = 0; i < count; i++) {
    const selectId = `select-${i}`;
    const inputId = `name-${i}`;
    container.innerHTML += `
      <label>Player ${i + 1}:
        <select id="${selectId}" onchange="handleNameDropdown('${selectId}', '${inputId}')">
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
  }

  document.getElementById("setup").style.display = "none";
  document.getElementById("game").style.display = "block";

  showHole();
  updateLeaderboard();
}


function showHole() {
  document.getElementById("holeHeader").innerText = `Hole ${currentHole}`;
  const container = document.getElementById("scoreInputs");
  container.innerHTML = "";

  players.forEach((player, idx) => {
    container.innerHTML += `<label>${player.name} hits: 
      <input type="number" id="hits-${idx}" min="0" max="9" value="0"><br>`;
  });
}

function getScore(hits) {
  if (hits === 0) return 5; // double bogey
  const scores = [3, 2, 1, 0, -1, -2, -3, -4, -5];
  return hits >= 1 && hits <= 9 ? scores[hits - 1] : 5;
}

function nextHole() {
  players.forEach((player, idx) => {
  const hits = parseInt(document.getElementById(`hits-${idx}`).value);
  const score = getScore(hits);
  player.scores.push(score);

  const labels = ["Double Bogey", "Par", "Birdie", "Ace", "Goose Egg", "Icicle", "Polar Bear", "Frostbite", "Snowman", "Avalanche"];
  const colors = ["#c00", "#222", "#3c6", "#08f", "#888", "#0cc", "#06c", "#339", "#446", "#113"];
  showScoreAnimation(`${player.name}: ${labels[hits] ?? "Unknown"}!`, colors[hits] ?? "#000");
});


  if (currentHole < 18) {
    currentHole++;
    showHole();
    updateLeaderboard();
  } else {
    updateLeaderboard(true);
  }
}

function updateLeaderboard(final = false) {
  let table = `<table><tr><th>Player</th>`;
  for (let i = 1; i <= 18; i++) {
    table += `<th>${i}</th>`;
  }
  table += `<th>Total</th></tr>`;

  players.forEach(player => {
    const total = player.scores.reduce((sum, s) => sum + s, 0);
    table += `<tr><td>${player.name}</td>`;
    for (let i = 0; i < 18; i++) {
      table += `<td>${player.scores[i] !== undefined ? player.scores[i] : ""}</td>`;
    }
    table += `<td>${total}</td></tr>`;
  });

  table += "</table>";

  const board = document.getElementById("leaderboard");
  board.innerHTML = final ? `<h2>🏆 Final Leaderboard</h2>${table}` : table;
}
function undoHole() {
  if (currentHole === 1) return alert("Nothing to undo.");

  currentHole--;
  players.forEach(player => player.scores.pop());
  showHole();
  updateLeaderboard();
}
window.onbeforeunload = function (e) {
  return "Are you sure you want to leave? Your game progress will be lost.";
};
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
