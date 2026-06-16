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
  ["game.js", "ESCAPE_TIME_LIMIT = 45"],
  ["game.js", "CAUGHT_ANIMATION_DURATION"],
  ["game.js", "URGENT_ALARM_THRESHOLD = 10"],
  ["game.js", "playAlarmBeep"],
  ["game.js", "updateUrgentAlarm"],
  ["game.js", "triggerCaughtAnimation"],
  ["game.js", "renderCaughtCaptureOverlay"],
  ["index.html", "ALARM 45.00"],
  ["game.js", "LOOK_PITCH_SPEED"],
  ["game.js", "-lookStick.y"],
  ["game.js", "isLaserActive"],
  ["game.js", "isSpikeExtended"],
  ["game.js", "hasLineOfSight"],
  ["game.js", "drawMapDiamond"],
  ["game.js", "renderScreenGrade"],
  ["game.js", "renderFloorPerspective"],
  ["game.js", "renderPolishedFloorSheen"],
  ["game.js", "renderMuseumWallArtwork"],
  ["game.js", "renderGallerySignage"],
  ["game.js", "drawMuseumDisplayCase"],
  ["game.js", "drawMuseumStatue"],
  ["game.js", "exhibits"],
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
