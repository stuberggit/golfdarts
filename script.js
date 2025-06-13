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

  const dartboard = document.getElementById("dartboardImage");
  if (dartboard) {
    dartboard.src = `images/dartboard-${currentHol
