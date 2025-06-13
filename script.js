let players = [];
let currentHole = 1;

function createPlayerInputs() {
  const count = parseInt(document.getElementById("playerCount").value);
  if (count < 1 || count > 20) return alert("Enter 1 to 20 players.");

  const playerOptions = [
    "Brandon", "Brock", "Dan", "Deanna", "Derrick", "Don", "Edgar",
    "Erin", "Mullins", "Phillip", "Pusti", "Stuberg", "T
