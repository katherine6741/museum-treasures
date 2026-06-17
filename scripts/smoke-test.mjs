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
  ["game.js", "CAMERA_FOLLOW_RATE"],
  ["game.js", "updateCameraSmoothing"],
  ["game.js", "lerpAngle"],
  ["game.js", "cameraAngle"],
  ["game.js", "-lookStick.y"],
  ["game.js", "isLaserActive"],
  ["game.js", "drawInfraredLaser"],
  ["game.js", "drawLaserEmitter"],
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
  ["game.js", "drawExitSign"],
  ["game.js", "drawExitDirectorySign"],
  ["game.js", "exit-sign"],
  ["game.js", "EXIT"],
  ["game.js", "drawSecurityGuard"],
  ["game.js", "Flashlight beam"],
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

const levels = extractLevels(files.get("game.js"));
const routeFailures = [];

for (const [levelName, level] of Object.entries(levels)) {
  const routeDistance = shortestRoute(level.map);
  if (!Number.isFinite(routeDistance)) {
    routeFailures.push(`${levelName} has no route from exit to diamond`);
  }
}

if (routeFailures.length > 0) {
  console.error("Smoke test failed:");
  for (const failure of routeFailures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Smoke test passed: Museum Treasures files, routes, and core behaviors are present.");

function extractLevels(source) {
  const match = source.match(/const LEVELS = (\{[\s\S]*?\n  \});/);
  if (!match) throw new Error("Could not find LEVELS object");
  return new Function(`return (${match[1]});`)();
}

function shortestRoute(rows) {
  const start = findTile(rows, "E");
  const goal = findTile(rows, "D");
  const queue = [[start.x, start.y, 0]];
  const seen = new Set([`${start.x},${start.y}`]);

  while (queue.length > 0) {
    const [x, y, distance] = queue.shift();
    if (x === goal.x && y === goal.y) return distance;

    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      const key = `${nx},${ny}`;
      if (seen.has(key)) continue;
      if (ny < 0 || ny >= rows.length || nx < 0 || nx >= rows[ny].length) continue;
      if (rows[ny][nx] === "1") continue;
      seen.add(key);
      queue.push([nx, ny, distance + 1]);
    }
  }

  return Infinity;
}

function findTile(rows, tile) {
  for (let y = 0; y < rows.length; y += 1) {
    const x = rows[y].indexOf(tile);
    if (x !== -1) return { x, y };
  }
  throw new Error(`Missing ${tile} tile`);
}
