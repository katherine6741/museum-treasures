import { readFile } from "node:fs/promises";

const requiredFiles = [
  "index.html",
  "style.css",
  "controls.js",
  "game.js",
  "README.md"
];

const checks = [
  ["index.html", "gameCanvas"],
  ["index.html", "moveJoystick"],
  ["index.html", "lookJoystick"],
  ["style.css", "touch-action: none"],
  ["controls.js", "TouchJoystick"],
  ["game.js", "playerHearts"],
  ["game.js", "hasDiamond"],
  ["game.js", "escapeTime"],
  ["game.js", "LOOK_PITCH_SPEED"],
  ["game.js", "isLaserActive"],
  ["game.js", "isSpikeExtended"],
  ["game.js", "hasLineOfSight"],
  ["game.js", "guardSpeed"],
  ["game.js", "MuseumTreasures"]
];

const files = new Map();

for (const file of requiredFiles) {
  files.set(file, await readFile(file, "utf8"));
}

const failures = checks.filter(([file, needle]) => !files.get(file).includes(needle));

if (failures.length > 0) {
  console.error("Smoke test failed:");
  for (const [file, needle] of failures) {
    console.error(`- ${file} is missing ${needle}`);
  }
  process.exit(1);
}

console.log("Smoke test passed: Museum Treasures files and core behaviors are present.");
