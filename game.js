(function () {
  "use strict";

  const TILE = 1;
  const PLAYER_RADIUS = 0.18;
  const BASE_SPEED = 2.35;
  const TURN_SPEED = 1.8;
  const LOOK_PITCH_SPEED = 0.72;
  const CAMERA_FOLLOW_RATE = 18;
  const MAX_CAMERA_PITCH = 0.18;
  const ESCAPE_TIME_LIMIT = 45;
  const CAUGHT_ANIMATION_DURATION = 1.8;
  const URGENT_ALARM_THRESHOLD = 10;
  const MASTER_VOLUME = 0.28;
  const FOV = Math.PI / 3;
  const MAX_RAY_DISTANCE = 18;

  const LEVELS = {
    easy: {
      label: "Easy",
      guardSpeed: 1.0,
      map: [
        "1111111111111",
        "1E00000100001",
        "1010111011101",
        "1000100000101",
        "1110101110101",
        "1000101D00101",
        "1011101010101",
        "1000001000101",
        "1011111011101",
        "100000000G001",
        "1111111111111"
      ],
      hazards: [
        { type: "laser", x: 5, y: 3 },
        { type: "laser", x: 7, y: 7 }
      ],
      exhibits: [
        { type: "display-case", x: 9.5, y: 1.5 },
        { type: "statue", x: 2.5, y: 7.5 }
      ],
      guards: [{ x: 10.5, y: 9.5, path: [[10.5, 9.5], [8.5, 9.5], [8.5, 7.5]] }]
    },
    medium: {
      label: "Medium",
      guardSpeed: 1.25,
      map: [
        "111111111111111",
        "1E0000000000001",
        "101110101111101",
        "100010100000101",
        "111010111110101",
        "100010000010001",
        "101111101011111",
        "1000001010000D1",
        "101110101110101",
        "100010000000101",
        "101011111011101",
        "100000000000G01",
        "111111111111111"
      ],
      hazards: [
        { type: "laser", x: 4, y: 5 },
        { type: "laser", x: 8, y: 5 },
        { type: "laser", x: 10, y: 9 },
        { type: "waste", x: 6, y: 7 },
        { type: "spike", x: 12, y: 7 }
      ],
      exhibits: [
        { type: "display-case", x: 7.5, y: 1.5 },
        { type: "statue", x: 3.5, y: 5.5 },
        { type: "display-case", x: 11.5, y: 9.5 }
      ],
      guards: [
        { x: 12.5, y: 11.5, path: [[12.5, 11.5], [9.5, 11.5], [9.5, 9.5]] },
        { x: 3.5, y: 9.5, path: [[3.5, 9.5], [5.5, 9.5], [5.5, 11.5]] }
      ]
    },
    hard: {
      label: "Hard",
      guardSpeed: 2.0,
      map: [
        "11111111111111111",
        "1E000001000000001",
        "10111110101111101",
        "10000010101000101",
        "11111010101010101",
        "10001000000010101",
        "10101111111010101",
        "10100000001010001",
        "10111110101011111",
        "100000101010000D1",
        "11111010101111011",
        "10001000000001001",
        "10101111111101001",
        "1000000000000G001",
        "11111111111111111"
      ],
      hazards: [
        { type: "laser", x: 5, y: 5 },
        { type: "laser", x: 12, y: 7 },
        { type: "laser", x: 8, y: 11 },
        { type: "waste", x: 7, y: 9 },
        { type: "waste", x: 14, y: 3 },
        { type: "spike", x: 3, y: 11 },
        { type: "spike", x: 10, y: 5 },
        { type: "spike", x: 13, y: 12 }
      ],
      exhibits: [
        { type: "display-case", x: 5.5, y: 3.5 },
        { type: "statue", x: 7.5, y: 7.5 },
        { type: "display-case", x: 11.5, y: 11.5 },
        { type: "statue", x: 14.5, y: 7.5 }
      ],
      guards: [
        { x: 13.5, y: 13.5, path: [[13.5, 13.5], [10.5, 13.5], [10.5, 11.5]] },
        { x: 3.5, y: 7.5, path: [[3.5, 7.5], [7.5, 7.5], [7.5, 5.5]] },
        { x: 12.5, y: 3.5, path: [[12.5, 3.5], [14.5, 3.5], [14.5, 7.5]] }
      ]
    }
  };

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const hearts = document.getElementById("hearts");
  const alarm = document.getElementById("alarm");
  const stateLabel = document.getElementById("stateLabel");
  const levelName = document.getElementById("levelName");
  const startOverlay = document.getElementById("startOverlay");
  const messageOverlay = document.getElementById("messageOverlay");
  const messageTitle = document.getElementById("messageTitle");
  const messageText = document.getElementById("messageText");
  const startButton = document.getElementById("startButton");
  const restartButton = document.getElementById("restartButton");
  const difficultyButtons = Array.from(document.querySelectorAll(".difficulty"));
  const moveJoystick = new window.MuseumControls.TouchJoystick(
    document.getElementById("moveJoystick"),
    document.getElementById("moveJoystickKnob")
  );
  const lookJoystick = new window.MuseumControls.TouchJoystick(
    document.getElementById("lookJoystick"),
    document.getElementById("lookJoystickKnob")
  );

  const keys = new Set();
  let selectedLevel = "easy";
  let lastFrame = performance.now();
  let game = createInitialGame(selectedLevel);
  let audioContext = null;
  let masterGain = null;
  let nextAlarmBeepAt = 0;

  function createInitialGame(levelKey) {
    const config = LEVELS[levelKey];
    const parsed = parseMap(config.map);
    return {
      levelKey,
      config,
      map: parsed.map,
      width: parsed.width,
      height: parsed.height,
      exit: parsed.exit,
      diamond: parsed.diamond,
      player: {
        x: parsed.exit.x + 0.5,
        y: parsed.exit.y + 0.5,
        targetAngle: 0,
        cameraAngle: 0,
        targetPitch: 0,
        cameraPitch: 0
      },
      playerHearts: 3,
      hasDiamond: false,
      escapeTime: ESCAPE_TIME_LIMIT,
      state: "ready",
      caughtTime: 0,
      caughtReason: "",
      hurtCooldown: 0,
      wasteTick: 0,
      hazards: config.hazards.map((hazard) => ({ ...hazard, lastHit: -99 })),
      exhibits: config.exhibits.map((exhibit) => ({ ...exhibit })),
      guards: config.guards.map((guard) => ({
        x: guard.x,
        y: guard.y,
        path: guard.path,
        targetIndex: 1,
        chase: false
      }))
    };
  }

  function parseMap(rows) {
    let exit = null;
    let diamond = null;
    const map = rows.map((row, y) => row.split("").map((cell, x) => {
      if (cell === "E") exit = { x, y };
      if (cell === "D") diamond = { x, y };
      return cell === "1" ? 1 : 0;
    }));
    return { map, width: rows[0].length, height: rows.length, exit, diamond };
  }

  function resizeCanvas() {
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.floor(window.innerWidth * scale));
    const height = Math.max(1, Math.floor(window.innerHeight * scale));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  }

  async function startGame() {
    await prepareAudio();
    stopUrgentAlarm();
    game = createInitialGame(selectedLevel);
    game.state = "playing";
    startOverlay.classList.add("hidden");
    messageOverlay.classList.add("hidden");
    syncHud();
  }

  function endGame(title, text) {
    stopUrgentAlarm();
    game.state = title === "Treasure Escaped" ? "won" : "lost";
    messageTitle.textContent = title;
    messageText.textContent = text;
    messageOverlay.classList.remove("hidden");
    syncHud();
  }

  function triggerCaughtAnimation(reason) {
    stopUrgentAlarm();
    game.state = "caught";
    game.caughtTime = 0;
    game.caughtReason = reason;
    game.escapeTime = 0;
    syncHud();
  }

  function syncHud() {
    hearts.textContent = Array.from({ length: 3 }, (_, index) => index < game.playerHearts ? "❤️" : "♡").join(" ");
    levelName.textContent = game.config.label;
    alarm.textContent = `ALARM ${Math.max(0, game.escapeTime).toFixed(2)}`;
    alarm.classList.toggle("hidden", !game.hasDiamond);
    stateLabel.textContent = getStateText();
  }

  async function prepareAudio() {
    const AudioEngine = window.AudioContext || window.webkitAudioContext;
    if (!AudioEngine) return false;
    if (!audioContext) {
      audioContext = new AudioEngine();
      masterGain = audioContext.createGain();
      masterGain.gain.value = MASTER_VOLUME;
      masterGain.connect(audioContext.destination);
    }
    if (audioContext.state === "suspended") {
      try {
        await audioContext.resume();
      } catch {
        return false;
      }
    }
    return audioContext.state === "running";
  }

  function stopUrgentAlarm() {
    nextAlarmBeepAt = 0;
  }

  function updateUrgentAlarm(time) {
    if (!game.hasDiamond || game.escapeTime > URGENT_ALARM_THRESHOLD || game.escapeTime <= 0) {
      stopUrgentAlarm();
      return;
    }
    if (!audioContext || !masterGain) return;
    if (audioContext.state === "suspended") {
      audioContext.resume();
      return;
    }

    const interval = game.escapeTime <= 5 ? 0.36 : 0.68;
    if (time < nextAlarmBeepAt) return;
    playAlarmBeep(game.escapeTime <= 5);
    nextAlarmBeepAt = time + interval;
  }

  function playAlarmBeep(isCritical) {
    const start = audioContext.currentTime;
    const duration = isCritical ? 0.16 : 0.2;
    const frequency = isCritical ? 980 : 760;

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.74, start + duration);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(isCritical ? 0.22 : 0.16, start + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    oscillator.connect(gain);
    gain.connect(masterGain);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  function getStateText() {
    if (game.state === "ready") return "Choose a difficulty";
    if (game.state === "won") return "Escaped with the diamond";
    if (game.state === "lost") return "Heist failed";
    if (game.state === "caught") return "Caught by museum security";
    if (game.hasDiamond) return "Run to the exit";
    return "Find the center diamond";
  }

  function isWall(x, y) {
    const tx = Math.floor(x);
    const ty = Math.floor(y);
    if (tx < 0 || ty < 0 || tx >= game.width || ty >= game.height) return true;
    return game.map[ty][tx] === 1;
  }

  function canMoveTo(x, y) {
    return !isWall(x - PLAYER_RADIUS, y - PLAYER_RADIUS)
      && !isWall(x + PLAYER_RADIUS, y - PLAYER_RADIUS)
      && !isWall(x - PLAYER_RADIUS, y + PLAYER_RADIUS)
      && !isWall(x + PLAYER_RADIUS, y + PLAYER_RADIUS);
  }

  function tryMove(entity, dx, dy) {
    const nextX = entity.x + dx;
    const nextY = entity.y + dy;
    if (canMoveTo(nextX, entity.y)) entity.x = nextX;
    if (canMoveTo(entity.x, nextY)) entity.y = nextY;
  }

  function damagePlayer(reason) {
    if (game.hurtCooldown > 0) return;
    game.playerHearts = Math.max(0, game.playerHearts - 1);
    game.hurtCooldown = 0.8;
    if (game.playerHearts <= 0) {
      endGame("Game Over", reason);
    }
  }

  function updatePlayer(dt, time) {
    const moveStick = moveJoystick.read();
    const lookStick = lookJoystick.read();
    const keyboardForward = (keys.has("w") || keys.has("arrowup") ? -1 : 0) + (keys.has("s") || keys.has("arrowdown") ? 1 : 0);
    const keyboardStrafe = (keys.has("d") ? 1 : 0) + (keys.has("a") ? -1 : 0);
    const keyboardTurn = (keys.has("arrowright") ? 1 : 0) + (keys.has("arrowleft") ? -1 : 0);
    const keyboardPitch = (keys.has("q") ? 1 : 0) + (keys.has("e") ? -1 : 0);
    const forwardInput = Math.abs(moveStick.y) > 0.05 ? moveStick.y : keyboardForward;
    const strafeInput = Math.abs(moveStick.x) > 0.05 ? moveStick.x : keyboardStrafe;
    const turnInput = Math.abs(lookStick.x) > 0.05 ? lookStick.x : keyboardTurn;
    const pitchInput = Math.abs(lookStick.y) > 0.05 ? -lookStick.y : keyboardPitch;
    const speedModifier = currentWasteHazard() ? 0.5 : 1;
    const forwardAmount = -forwardInput * BASE_SPEED * speedModifier * dt;
    const strafeAmount = strafeInput * BASE_SPEED * speedModifier * dt;

    game.player.targetAngle += turnInput * TURN_SPEED * dt;
    game.player.targetPitch = clamp(
      game.player.targetPitch + pitchInput * LOOK_PITCH_SPEED * dt,
      -MAX_CAMERA_PITCH,
      MAX_CAMERA_PITCH
    );
    updateCameraSmoothing(dt);

    const movementAngle = game.player.targetAngle;
    tryMove(
      game.player,
      Math.cos(movementAngle) * forwardAmount + Math.cos(movementAngle + Math.PI / 2) * strafeAmount,
      Math.sin(movementAngle) * forwardAmount + Math.sin(movementAngle + Math.PI / 2) * strafeAmount
    );

    if (distanceToTile(game.player, game.diamond) < 0.48 && !game.hasDiamond) {
      game.hasDiamond = true;
      game.escapeTime = ESCAPE_TIME_LIMIT;
    }

    if (game.hasDiamond && distanceToTile(game.player, game.exit) < 0.55) {
      endGame("Treasure Escaped", "You reached the blue exit gate before the alarm locked the museum.");
    }

    for (const hazard of game.hazards) {
      const nearHazard = Math.floor(game.player.x) === hazard.x && Math.floor(game.player.y) === hazard.y;
      if (!nearHazard) continue;
      if (hazard.type === "laser" && isLaserActive(time) && time - hazard.lastHit > 1.1) {
        hazard.lastHit = time;
        damagePlayer("A blinking laser drained your last heart.");
      }
      if (hazard.type === "spike" && isSpikeExtended(time) && time - hazard.lastHit > 1.1) {
        hazard.lastHit = time;
        damagePlayer("Retractable spikes ended the heist.");
      }
    }

    if (currentWasteHazard()) {
      game.wasteTick += dt;
      if (game.wasteTick > 1.2) {
        game.wasteTick = 0;
        damagePlayer("Toxic waste drained your last heart.");
      }
    } else {
      game.wasteTick = 0;
    }
  }

  function updateCameraSmoothing(dt) {
    const follow = 1 - Math.exp(-CAMERA_FOLLOW_RATE * dt);
    game.player.cameraAngle = lerpAngle(game.player.cameraAngle, game.player.targetAngle, follow);
    game.player.cameraPitch += (game.player.targetPitch - game.player.cameraPitch) * follow;
  }

  function currentWasteHazard() {
    return game.hazards.find((hazard) => hazard.type === "waste"
      && Math.floor(game.player.x) === hazard.x
      && Math.floor(game.player.y) === hazard.y);
  }

  function updateGuards(dt) {
    for (const guard of game.guards) {
      const distance = Math.hypot(game.player.x - guard.x, game.player.y - guard.y);
      guard.chase = distance < 5.5 && hasLineOfSight(guard.x, guard.y, game.player.x, game.player.y);

      let targetX = game.player.x;
      let targetY = game.player.y;
      if (!guard.chase) {
        const target = guard.path[guard.targetIndex];
        targetX = target[0];
        targetY = target[1];
        if (Math.hypot(targetX - guard.x, targetY - guard.y) < 0.16) {
          guard.targetIndex = (guard.targetIndex + 1) % guard.path.length;
        }
      }

      const angle = Math.atan2(targetY - guard.y, targetX - guard.x);
      const speed = (guard.chase ? 1.35 : 0.78) * game.config.guardSpeed;
      tryMove(guard, Math.cos(angle) * speed * dt, Math.sin(angle) * speed * dt);

      if (distance < 0.42) {
        endGame("Game Over", "A guard caught you. Guards cause instant defeat.");
      }
    }
  }

  function hasLineOfSight(x1, y1, x2, y2) {
    const steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1) * 8);
    for (let step = 1; step < steps; step += 1) {
      const t = step / steps;
      const x = x1 + (x2 - x1) * t;
      const y = y1 + (y2 - y1) * t;
      if (isWall(x, y)) return false;
    }
    return true;
  }

  function distanceToTile(point, tile) {
    return Math.hypot(point.x - (tile.x + 0.5), point.y - (tile.y + 0.5));
  }

  function isLaserActive(time) {
    return Math.floor(time / 2) % 2 === 0;
  }

  function isSpikeExtended(time) {
    return Math.sin(time * Math.PI) > 0.15;
  }

  function castRay(angle) {
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    let distance = 0;
    while (distance < MAX_RAY_DISTANCE) {
      distance += 0.025;
      const x = game.player.x + cos * distance;
      const y = game.player.y + sin * distance;
      if (isWall(x, y)) {
        return {
          distance,
          x,
          y,
          side: Math.abs(x - Math.floor(x) - 0.5) > Math.abs(y - Math.floor(y) - 0.5) ? "x" : "y"
        };
      }
    }
    return { distance: MAX_RAY_DISTANCE, x: game.player.x + cos * MAX_RAY_DISTANCE, y: game.player.y + sin * MAX_RAY_DISTANCE, side: "x" };
  }

  function render(time) {
    resizeCanvas();
    const width = canvas.width;
    const height = canvas.height;
    const cameraPitch = game.player.cameraPitch;
    const cameraAngle = game.player.cameraAngle;
    const horizon = height * (0.48 + cameraPitch);

    renderMuseumBackdrop(width, height, horizon, time);

    const columns = Math.min(width, 520);
    const columnWidth = width / columns;
    const depthBuffer = [];
    for (let i = 0; i < columns; i += 1) {
      const cameraX = i / columns - 0.5;
      const angle = cameraAngle + cameraX * FOV;
      const hit = castRay(angle);
      const corrected = hit.distance * Math.cos(angle - cameraAngle);
      const wallHeight = Math.min(height, height / Math.max(0.001, corrected));
      const x = i * columnWidth;
      const y = horizon - wallHeight / 2;
      renderWallColumn(hit, corrected, x, y, Math.ceil(columnWidth) + 1, wallHeight, time);
      depthBuffer[i] = corrected;
    }

    renderWorldObjects(depthBuffer, time, cameraAngle);
    renderMinimap(time, cameraAngle);
    renderScreenGrade(width, height, time);
  }

  function renderMuseumBackdrop(width, height, horizon, time) {
    const ceiling = ctx.createLinearGradient(0, 0, 0, horizon);
    ceiling.addColorStop(0, "#03060b");
    ceiling.addColorStop(0.48, "#0b1320");
    ceiling.addColorStop(1, "#1a2a3a");
    ctx.fillStyle = ceiling;
    ctx.fillRect(0, 0, width, horizon);

    const floor = ctx.createLinearGradient(0, horizon, 0, height);
    floor.addColorStop(0, "#343842");
    floor.addColorStop(0.24, "#242834");
    floor.addColorStop(0.62, "#121720");
    floor.addColorStop(1, "#06080d");
    ctx.fillStyle = floor;
    ctx.fillRect(0, horizon, width, height - horizon);

    renderCeilingGlow(width, horizon, time);
    renderGallerySignage(width, horizon);
    renderFloorPerspective(width, height, horizon);
    renderPolishedFloorSheen(width, height, horizon, time);
  }

  function renderCeilingGlow(width, horizon, time) {
    const glowCount = 5;
    for (let i = 0; i < glowCount; i += 1) {
      const x = (i + 0.5) * (width / glowCount) + Math.sin(time * 0.5 + i) * width * 0.01;
      const y = horizon * 0.34;
      const radius = width * 0.12;
      const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
      glow.addColorStop(0, "rgba(255, 218, 148, 0.08)");
      glow.addColorStop(1, "rgba(255, 209, 102, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
  }

  function renderGallerySignage(width, horizon) {
    const signWidth = width * 0.18;
    const signHeight = Math.max(28, horizon * 0.085);
    const x = width / 2 - signWidth / 2;
    const y = horizon * 0.18;

    ctx.save();
    ctx.fillStyle = "rgba(5, 10, 20, 0.62)";
    ctx.fillRect(x, y, signWidth, signHeight);
    ctx.strokeStyle = "rgba(255, 209, 102, 0.44)";
    ctx.lineWidth = Math.max(1, width * 0.001);
    ctx.strokeRect(x, y, signWidth, signHeight);
    ctx.fillStyle = "rgba(255, 227, 154, 0.92)";
    ctx.font = `${Math.max(10, signHeight * 0.34)}px Inter, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("MUSEUM GALLERY", width / 2, y + signHeight * 0.42);
    ctx.fillStyle = "rgba(218, 239, 255, 0.62)";
    ctx.font = `${Math.max(8, signHeight * 0.22)}px Inter, system-ui, sans-serif`;
    ctx.fillText("ANCIENT GEMS", width / 2, y + signHeight * 0.72);
    ctx.restore();
  }

  function renderFloorPerspective(width, height, horizon) {
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = "rgba(210, 222, 232, 0.24)";
    ctx.lineWidth = Math.max(1, width * 0.001);

    const centerX = width / 2;
    for (let i = -7; i <= 7; i += 1) {
      const startX = centerX + i * width * 0.055;
      ctx.beginPath();
      ctx.moveTo(centerX + i * width * 0.012, horizon);
      ctx.lineTo(startX, height);
      ctx.stroke();
    }

    for (let i = 1; i <= 8; i += 1) {
      const t = i / 8;
      const y = horizon + (height - horizon) * (t * t);
      ctx.globalAlpha = 0.12 + t * 0.16;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function renderPolishedFloorSheen(width, height, horizon, time) {
    ctx.save();
    const reflection = ctx.createLinearGradient(0, horizon, 0, height);
    reflection.addColorStop(0, "rgba(255, 222, 166, 0.12)");
    reflection.addColorStop(0.34, "rgba(191, 208, 224, 0.08)");
    reflection.addColorStop(0.58, "rgba(78, 93, 110, 0.05)");
    reflection.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = reflection;
    ctx.fillRect(0, horizon, width, height - horizon);

    ctx.globalAlpha = 0.1;
    ctx.strokeStyle = "rgba(255, 238, 204, 0.42)";
    ctx.lineWidth = Math.max(1, width * 0.0008);
    for (let i = 0; i < 7; i += 1) {
      const y = horizon + (height - horizon) * (0.18 + i * 0.1);
      const offset = Math.sin(time * 0.25 + i) * width * 0.012;
      ctx.beginPath();
      ctx.moveTo(width * 0.18 + offset, y);
      ctx.quadraticCurveTo(width * 0.5, y + height * 0.018, width * 0.82 - offset, y);
      ctx.stroke();
    }

    const warmPool = ctx.createRadialGradient(width * 0.5, horizon + (height - horizon) * 0.18, 0, width * 0.5, horizon + (height - horizon) * 0.18, width * 0.38);
    warmPool.addColorStop(0, "rgba(255, 209, 102, 0.08)");
    warmPool.addColorStop(1, "rgba(255, 209, 102, 0)");
    ctx.fillStyle = warmPool;
    ctx.fillRect(0, horizon, width, height - horizon);
    ctx.restore();
  }

  function renderWallColumn(hit, distance, x, y, width, height, time) {
    const fog = clamp(distance / MAX_RAY_DISTANCE, 0, 1);
    const base = Math.max(42, 222 - distance * 27);
    const warm = hit.side === "x";
    const panel = wallPanelFactor(hit);
    const shimmer = Math.sin((hit.x + hit.y) * 5 + time * 0.7) * 4;
    const marble = Math.sin(hit.x * 13.5 + hit.y * 9.5) * 7 + Math.sin((hit.x - hit.y) * 21) * 3;
    const r = Math.floor((warm ? base * 1.08 : base * 0.68) + panel * 20 + shimmer);
    const g = Math.floor((warm ? base * 0.82 : base * 0.82) + panel * 16 + marble);
    const b = Math.floor((warm ? base * 0.5 : base * 1.08) + panel * 18 + marble * 1.2);

    const gradient = ctx.createLinearGradient(0, y, 0, y + height);
    gradient.addColorStop(0, `rgb(${clampColor(r + 22)},${clampColor(g + 22)},${clampColor(b + 22)})`);
    gradient.addColorStop(0.12, `rgb(${clampColor(r)},${clampColor(g)},${clampColor(b)})`);
    gradient.addColorStop(0.78, `rgb(${clampColor(r * 0.72)},${clampColor(g * 0.72)},${clampColor(b * 0.72)})`);
    gradient.addColorStop(1, `rgb(${clampColor(r * 0.46)},${clampColor(g * 0.46)},${clampColor(b * 0.46)})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, height);

    const local = wallTextureCoordinate(hit);
    if (local < 0.08 || local > 0.92) {
      ctx.fillStyle = "rgba(255, 209, 102, 0.2)";
      ctx.fillRect(x, y, width, height);
    }
    if (local > 0.47 && local < 0.53) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.075)";
      ctx.fillRect(x, y + height * 0.08, width, height * 0.84);
    }
    if ((local > 0.18 && local < 0.2) || (local > 0.8 && local < 0.82)) {
      ctx.fillStyle = "rgba(3, 6, 12, 0.22)";
      ctx.fillRect(x, y, width, height);
    }
    renderMuseumWallArtwork(hit, local, distance, x, y, width, height);

    ctx.fillStyle = `rgba(5, 10, 20, ${0.08 + fog * 0.54})`;
    ctx.fillRect(x, y, width, height);

    if (distance < 2.5) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.045)";
      ctx.fillRect(x, y, width, Math.max(2, height * 0.012));
    }
  }

  function wallTextureCoordinate(hit) {
    const coordinate = hit.side === "x" ? hit.y : hit.x;
    return coordinate - Math.floor(coordinate);
  }

  function wallPanelFactor(hit) {
    const local = wallTextureCoordinate(hit);
    return local > 0.12 && local < 0.88 ? 1 : 0;
  }

  function clampColor(value) {
    return Math.max(0, Math.min(255, Math.floor(value)));
  }

  function renderMuseumWallArtwork(hit, local, distance, x, y, width, height) {
    if (distance < 1.2 || distance > 9.5) return;
    const tileX = Math.floor(hit.x);
    const tileY = Math.floor(hit.y);
    const hash = Math.abs((tileX * 37 + tileY * 53 + (hit.side === "x" ? 11 : 23)) % 9);
    if (hash > 2) return;
    if (local < 0.26 || local > 0.74) return;

    const top = y + height * 0.24;
    const artHeight = height * 0.23;
    const isLabelStrip = local > 0.46 && local < 0.54;
    const palette = hash === 0
      ? ["rgba(255, 209, 102, 0.82)", "rgba(85, 214, 255, 0.58)"]
      : hash === 1
        ? ["rgba(211, 232, 255, 0.72)", "rgba(255, 47, 95, 0.42)"]
        : ["rgba(181, 255, 216, 0.62)", "rgba(255, 255, 255, 0.36)"];

    ctx.fillStyle = "rgba(12, 8, 4, 0.68)";
    ctx.fillRect(x, top - artHeight * 0.12, width, artHeight * 1.24);
    ctx.fillStyle = "rgba(255, 209, 102, 0.26)";
    ctx.fillRect(x, top - artHeight * 0.08, width, artHeight * 1.16);
    const art = ctx.createLinearGradient(0, top, 0, top + artHeight);
    art.addColorStop(0, palette[0]);
    art.addColorStop(1, palette[1]);
    ctx.fillStyle = art;
    ctx.fillRect(x, top, width, artHeight);

    if (isLabelStrip) {
      ctx.fillStyle = "rgba(255, 246, 215, 0.78)";
      ctx.fillRect(x, top + artHeight * 1.18, width, Math.max(2, artHeight * 0.08));
    }
  }

  function renderWorldObjects(depthBuffer, time, cameraAngle) {
    const objects = [];
    if (!game.hasDiamond) objects.push({ type: "diamond", x: game.diamond.x + 0.5, y: game.diamond.y + 0.5 });
    objects.push({ type: "exit", x: game.exit.x + 0.5, y: game.exit.y + 0.5 });
    objects.push({ type: "exit-sign", x: game.exit.x + 1.35, y: game.exit.y + 0.5 });
    for (const hazard of game.hazards) objects.push({ ...hazard, x: hazard.x + 0.5, y: hazard.y + 0.5 });
    for (const exhibit of game.exhibits) objects.push(exhibit);
    for (const guard of game.guards) objects.push({ type: guard.chase ? "guard-alert" : "guard", x: guard.x, y: guard.y });

    objects.sort((a, b) => Math.hypot(b.x - game.player.x, b.y - game.player.y) - Math.hypot(a.x - game.player.x, a.y - game.player.y));
    for (const object of objects) {
      const dx = object.x - game.player.x;
      const dy = object.y - game.player.y;
      const distance = Math.hypot(dx, dy);
      const angleToObject = normalizeAngle(Math.atan2(dy, dx) - cameraAngle);
      if (Math.abs(angleToObject) > FOV * 0.72 || distance < 0.05) continue;

      const screenX = (0.5 + angleToObject / FOV) * canvas.width;
      const size = Math.min(canvas.height * 0.8, canvas.height / distance * objectScale(object.type));
      const column = Math.floor(screenX / (canvas.width / depthBuffer.length));
      if (depthBuffer[column] && depthBuffer[column] < distance - 0.15) continue;
      drawSprite(object, screenX, canvas.height * 0.52, size, time);
    }
  }

  function objectScale(type) {
    if (type === "exit") return 0.65;
    if (type === "exit-sign") return 0.22;
    if (type === "laser") return 0.85;
    if (type === "waste" || type === "spike") return 0.5;
    if (type === "display-case") return 0.46;
    if (type === "statue") return 0.58;
    return 0.8;
  }

  function drawSprite(object, x, floorY, size, time) {
    ctx.save();
    ctx.translate(x, floorY);
    if (object.type === "diamond") {
      drawGlow(0, -size * 0.16, size * 0.78, "rgba(85, 214, 255, 0.4)");
      ctx.rotate(Math.sin(time * 2.4) * 0.1);
      ctx.shadowColor = "rgba(85, 214, 255, 0.8)";
      ctx.shadowBlur = size * 0.12;
      ctx.fillStyle = "#9df3ff";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = Math.max(2, size * 0.03);
      polygon([[0, -size * 0.62], [size * 0.36, -size * 0.18], [0, size * 0.36], [-size * 0.36, -size * 0.18]], true);
      ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
      polygon([[0, -size * 0.5], [size * 0.16, -size * 0.18], [0, 0], [-size * 0.16, -size * 0.18]], true);
      ctx.shadowBlur = 0;
    } else if (object.type === "exit") {
      drawGlow(0, -size * 0.28, size * 0.82, "rgba(85, 214, 255, 0.24)");
      ctx.fillStyle = "rgba(85, 214, 255, 0.28)";
      ctx.fillRect(-size * 0.36, -size * 0.9, size * 0.72, size * 1.2);
      ctx.strokeStyle = "#55d6ff";
      ctx.lineWidth = Math.max(3, size * 0.04);
      ctx.strokeRect(-size * 0.36, -size * 0.9, size * 0.72, size * 1.2);
      drawExitSign(size);
    } else if (object.type === "exit-sign") {
      drawExitDirectorySign(size);
    } else if (object.type === "laser") {
      drawInfraredLaser(size, time);
    } else if (object.type === "waste") {
      drawGlow(0, size * 0.04, size * 0.36, "rgba(69, 227, 148, 0.26)");
      ctx.fillStyle = "rgba(69, 227, 148, 0.68)";
      ctx.beginPath();
      ctx.ellipse(0, size * 0.05, size * 0.48, size * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (object.type === "spike") {
      const extended = isSpikeExtended(time) ? 1 : 0.25;
      ctx.fillStyle = "#d8e0ea";
      for (let i = -1; i <= 1; i += 1) {
        polygon([[i * size * 0.18, size * 0.12], [i * size * 0.18 + size * 0.12, -size * 0.42 * extended], [i * size * 0.18 + size * 0.24, size * 0.12]], false);
      }
    } else if (object.type === "display-case") {
      drawMuseumDisplayCase(size, time);
    } else if (object.type === "statue") {
      drawMuseumStatue(size);
    } else if (object.type === "guard" || object.type === "guard-alert") {
      drawSecurityGuard(size, object.type === "guard-alert", time);
    } else {
      ctx.fillStyle = "#f7f1e3";
      ctx.fillRect(-size * 0.18, -size * 0.5, size * 0.36, size * 0.5);
    }
    ctx.restore();
  }

  function drawSecurityGuard(size, alert, time) {
    const pulse = alert ? 0.7 + Math.sin(time * 10) * 0.2 : 0.45;
    drawGlow(0, -size * 0.42, size * (alert ? 0.62 : 0.36), alert ? "rgba(255, 47, 95, 0.22)" : "rgba(85, 214, 255, 0.1)");

    ctx.save();
    ctx.shadowColor = alert ? "rgba(255, 47, 95, 0.6)" : "rgba(3, 6, 12, 0.55)";
    ctx.shadowBlur = size * 0.04;

    // Flashlight beam angled across the corridor.
    ctx.globalAlpha = alert ? 0.28 : 0.16;
    ctx.fillStyle = alert ? "rgba(255, 214, 223, 0.36)" : "rgba(218, 239, 255, 0.28)";
    ctx.beginPath();
    ctx.moveTo(size * 0.16, -size * 0.34);
    ctx.lineTo(size * 0.74, -size * 0.58);
    ctx.lineTo(size * 0.72, -size * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    // Legs and boots.
    ctx.fillStyle = "#101722";
    ctx.fillRect(-size * 0.16, -size * 0.08, size * 0.12, size * 0.24);
    ctx.fillRect(size * 0.04, -size * 0.08, size * 0.12, size * 0.24);
    ctx.fillStyle = "#06090f";
    ctx.fillRect(-size * 0.19, size * 0.14, size * 0.17, size * 0.05);
    ctx.fillRect(size * 0.02, size * 0.14, size * 0.17, size * 0.05);

    // Uniform body.
    const uniform = ctx.createLinearGradient(0, -size * 0.62, 0, size * 0.1);
    uniform.addColorStop(0, alert ? "#273147" : "#1f2b3a");
    uniform.addColorStop(0.5, alert ? "#182032" : "#142033");
    uniform.addColorStop(1, "#080d16");
    ctx.fillStyle = uniform;
    ctx.beginPath();
    ctx.moveTo(-size * 0.2, -size * 0.58);
    ctx.lineTo(size * 0.2, -size * 0.58);
    ctx.lineTo(size * 0.26, -size * 0.08);
    ctx.lineTo(-size * 0.26, -size * 0.08);
    ctx.closePath();
    ctx.fill();

    // Shoulders, belt, badge, tie.
    ctx.fillStyle = alert ? "rgba(255, 47, 95, 0.8)" : "rgba(255, 209, 102, 0.72)";
    ctx.fillRect(-size * 0.22, -size * 0.52, size * 0.14, size * 0.035);
    ctx.fillRect(size * 0.08, -size * 0.52, size * 0.14, size * 0.035);
    ctx.fillStyle = "#05080e";
    ctx.fillRect(-size * 0.24, -size * 0.2, size * 0.48, size * 0.045);
    ctx.fillStyle = "#dff8ff";
    ctx.fillRect(size * 0.07, -size * 0.43, size * 0.08, size * 0.055);
    ctx.fillStyle = alert ? "#ff2f5f" : "#55d6ff";
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.52);
    ctx.lineTo(size * 0.04, -size * 0.34);
    ctx.lineTo(0, -size * 0.24);
    ctx.lineTo(-size * 0.04, -size * 0.34);
    ctx.closePath();
    ctx.fill();

    // Arms and flashlight.
    ctx.strokeStyle = "#111a28";
    ctx.lineWidth = Math.max(4, size * 0.055);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-size * 0.2, -size * 0.46);
    ctx.lineTo(-size * 0.34, -size * 0.22);
    ctx.moveTo(size * 0.2, -size * 0.44);
    ctx.lineTo(size * 0.36, -size * 0.28);
    ctx.stroke();
    ctx.strokeStyle = alert ? "#ff9ab0" : "#cfe9ff";
    ctx.lineWidth = Math.max(2, size * 0.02);
    ctx.beginPath();
    ctx.moveTo(size * 0.31, -size * 0.3);
    ctx.lineTo(size * 0.45, -size * 0.36);
    ctx.stroke();

    // Head and cap.
    ctx.fillStyle = "#d2a77d";
    ctx.beginPath();
    ctx.arc(0, -size * 0.72, size * 0.13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0a101a";
    ctx.fillRect(-size * 0.15, -size * 0.86, size * 0.3, size * 0.08);
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.82, size * 0.16, size * 0.07, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = alert ? `rgba(255, 47, 95, ${pulse})` : "rgba(255, 209, 102, 0.74)";
    ctx.fillRect(-size * 0.045, -size * 0.855, size * 0.09, size * 0.018);

    // Face shadow/visor for a more serious security look.
    ctx.fillStyle = "rgba(5, 10, 20, 0.35)";
    ctx.fillRect(-size * 0.1, -size * 0.75, size * 0.2, size * 0.035);
    ctx.restore();
  }

  function drawGlow(x, y, radius, color) {
    const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
    glow.addColorStop(0, color);
    glow.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawInfraredLaser(size, time) {
    const active = isLaserActive(time);
    const pulse = active ? 0.72 + Math.sin(time * 14) * 0.18 : 0.18;
    const beams = [
      { x1: -0.42, y1: -0.35, x2: 0.42, y2: -0.72 },
      { x1: -0.42, y1: -0.05, x2: 0.42, y2: -0.42 }
    ];

    ctx.save();
    for (const beam of beams) {
      const x1 = beam.x1 * size;
      const y1 = beam.y1 * size;
      const x2 = beam.x2 * size;
      const y2 = beam.y2 * size;

      ctx.globalAlpha = pulse * 0.42;
      ctx.strokeStyle = "#ff2f5f";
      ctx.lineWidth = Math.max(12, size * 0.16);
      ctx.lineCap = "round";
      ctx.shadowColor = "rgba(255, 47, 95, 0.82)";
      ctx.shadowBlur = size * 0.12;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      ctx.globalAlpha = active ? 1 : 0.28;
      ctx.strokeStyle = "#ffd6df";
      ctx.lineWidth = Math.max(3, size * 0.035);
      ctx.shadowBlur = size * 0.05;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      drawLaserEmitter(x1, y1, size, active);
      drawLaserEmitter(x2, y2, size, active);
    }
    ctx.restore();
  }

  function drawLaserEmitter(x, y, size, active) {
    ctx.save();
    ctx.globalAlpha = active ? 0.95 : 0.45;
    ctx.fillStyle = "rgba(10, 12, 18, 0.9)";
    ctx.strokeStyle = active ? "#ff9ab0" : "rgba(255, 154, 176, 0.45)";
    ctx.lineWidth = Math.max(2, size * 0.018);
    ctx.beginPath();
    ctx.arc(x, y, Math.max(5, size * 0.045), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = active ? "#ff2f5f" : "rgba(255, 47, 95, 0.4)";
    ctx.beginPath();
    ctx.arc(x, y, Math.max(2, size * 0.018), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawExitSign(size) {
    const signWidth = size * 0.64;
    const signHeight = size * 0.16;
    const signY = -size * 0.98;

    ctx.save();
    ctx.shadowColor = "rgba(85, 214, 255, 0.9)";
    ctx.shadowBlur = size * 0.08;
    ctx.fillStyle = "rgba(3, 10, 18, 0.82)";
    ctx.fillRect(-signWidth / 2, signY, signWidth, signHeight);
    ctx.strokeStyle = "rgba(85, 214, 255, 0.92)";
    ctx.lineWidth = Math.max(2, size * 0.018);
    ctx.strokeRect(-signWidth / 2, signY, signWidth, signHeight);

    ctx.fillStyle = "#dff8ff";
    ctx.font = `${Math.max(10, size * 0.11)}px Inter, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("EXIT", 0, signY + signHeight * 0.54);

    ctx.strokeStyle = "rgba(85, 214, 255, 0.62)";
    ctx.lineWidth = Math.max(2, size * 0.018);
    ctx.beginPath();
    ctx.moveTo(-size * 0.26, size * 0.36);
    ctx.lineTo(size * 0.26, size * 0.36);
    ctx.moveTo(size * 0.16, size * 0.28);
    ctx.lineTo(size * 0.28, size * 0.36);
    ctx.lineTo(size * 0.16, size * 0.44);
    ctx.stroke();
    ctx.restore();
  }

  function drawExitDirectorySign(size) {
    drawGlow(0, -size * 0.38, size * 0.72, "rgba(85, 214, 255, 0.2)");
    ctx.save();
    ctx.shadowColor = "rgba(85, 214, 255, 0.72)";
    ctx.shadowBlur = size * 0.08;

    ctx.fillStyle = "rgba(3, 10, 18, 0.86)";
    ctx.fillRect(-size * 0.38, -size * 0.68, size * 0.76, size * 0.24);
    ctx.strokeStyle = "rgba(85, 214, 255, 0.9)";
    ctx.lineWidth = Math.max(2, size * 0.02);
    ctx.strokeRect(-size * 0.38, -size * 0.68, size * 0.76, size * 0.24);

    ctx.fillStyle = "#dff8ff";
    ctx.font = `${Math.max(10, size * 0.12)}px Inter, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("EXIT", 0, -size * 0.55);

    ctx.strokeStyle = "rgba(85, 214, 255, 0.78)";
    ctx.lineWidth = Math.max(2, size * 0.025);
    ctx.beginPath();
    ctx.moveTo(-size * 0.18, -size * 0.24);
    ctx.lineTo(size * 0.14, -size * 0.24);
    ctx.lineTo(size * 0.06, -size * 0.32);
    ctx.moveTo(size * 0.14, -size * 0.24);
    ctx.lineTo(size * 0.06, -size * 0.16);
    ctx.stroke();

    ctx.fillStyle = "rgba(85, 214, 255, 0.18)";
    ctx.fillRect(-size * 0.28, -size * 0.06, size * 0.56, size * 0.08);
    ctx.restore();
  }

  function drawMuseumDisplayCase(size, time) {
    drawGlow(0, -size * 0.18, size * 0.58, "rgba(255, 209, 102, 0.16)");
    ctx.fillStyle = "rgba(8, 15, 29, 0.72)";
    ctx.fillRect(-size * 0.36, -size * 0.08, size * 0.72, size * 0.18);
    ctx.fillStyle = "rgba(180, 225, 255, 0.22)";
    ctx.strokeStyle = "rgba(218, 239, 255, 0.72)";
    ctx.lineWidth = Math.max(2, size * 0.025);
    ctx.fillRect(-size * 0.3, -size * 0.54, size * 0.6, size * 0.46);
    ctx.strokeRect(-size * 0.3, -size * 0.54, size * 0.6, size * 0.46);
    ctx.fillStyle = "rgba(255, 255, 255, 0.34)";
    ctx.fillRect(-size * 0.24, -size * 0.5, size * 0.05, size * 0.34);
    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(0, -size * 0.3 + Math.sin(time * 1.2) * size * 0.01, size * 0.11, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawMuseumStatue(size) {
    drawGlow(0, -size * 0.22, size * 0.48, "rgba(211, 232, 255, 0.12)");
    ctx.fillStyle = "#d8e0ea";
    ctx.strokeStyle = "rgba(5, 10, 20, 0.55)";
    ctx.lineWidth = Math.max(2, size * 0.025);
    ctx.beginPath();
    ctx.arc(0, -size * 0.58, size * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-size * 0.16, -size * 0.43);
    ctx.lineTo(size * 0.16, -size * 0.43);
    ctx.lineTo(size * 0.1, -size * 0.08);
    ctx.lineTo(-size * 0.1, -size * 0.08);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(255, 255, 255, 0.24)";
    ctx.fillRect(-size * 0.22, -size * 0.08, size * 0.44, size * 0.16);
  }

  function polygon(points, stroke) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i][0], points[i][1]);
    ctx.closePath();
    ctx.fill();
    if (stroke) ctx.stroke();
  }

  function renderMinimap(time, cameraAngle) {
    const size = Math.min(canvas.width * 0.22, 260);
    const pixelRatio = window.devicePixelRatio || 1;
    const pad = 16 * pixelRatio;
    const bottomLift = 76 * pixelRatio;
    const cell = size / Math.max(game.width, game.height);
    const x0 = (canvas.width - size) / 2;
    const y0 = canvas.height - size - pad - bottomLift;

    ctx.fillStyle = "rgba(5, 10, 20, 0.78)";
    ctx.fillRect(x0 - 10, y0 - 10, size + 20, size + 20);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = Math.max(1, cell * 0.12);
    ctx.strokeRect(x0 - 10, y0 - 10, size + 20, size + 20);
    for (let y = 0; y < game.height; y += 1) {
      for (let x = 0; x < game.width; x += 1) {
        ctx.fillStyle = game.map[y][x] ? "rgba(8, 15, 29, 0.88)" : "rgba(128, 160, 190, 0.34)";
        ctx.fillRect(x0 + x * cell, y0 + y * cell, Math.max(1, cell - 1), Math.max(1, cell - 1));
      }
    }

    drawMapDot(x0, y0, cell, game.exit.x + 0.5, game.exit.y + 0.5, "#55d6ff", 0.72);
    if (!game.hasDiamond) drawMapDiamond(x0, y0, cell, game.diamond.x + 0.5, game.diamond.y + 0.5, time);
    for (const guard of game.guards) drawMapDot(x0, y0, cell, guard.x, guard.y, guard.chase ? "#ff2f5f" : "#ffffff", 0.62);
    drawPlayerMapBeam(x0, y0, size, cell, game.player.x, game.player.y, cameraAngle);
    drawMapDot(x0, y0, cell, game.player.x, game.player.y, "#45e394", 0.78);
  }

  function drawPlayerMapBeam(x0, y0, mapSize, cell, x, y, angle) {
    const centerX = x0 + x * cell;
    const centerY = y0 + y * cell;
    const beamLength = Math.max(cell * 2.2, mapSize * 0.18);
    const beamSpread = Math.PI / 5;
    const leftAngle = angle - beamSpread;
    const rightAngle = angle + beamSpread;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, y0, mapSize, mapSize);
    ctx.clip();

    const gradientEndX = centerX + Math.cos(angle) * beamLength;
    const gradientEndY = centerY + Math.sin(angle) * beamLength;
    const beamGradient = ctx.createRadialGradient(centerX, centerY, 0, gradientEndX, gradientEndY, beamLength);
    beamGradient.addColorStop(0, "rgba(69, 227, 148, 0.28)");
    beamGradient.addColorStop(0.58, "rgba(69, 227, 148, 0.12)");
    beamGradient.addColorStop(1, "rgba(69, 227, 148, 0)");

    ctx.fillStyle = beamGradient;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX + Math.cos(leftAngle) * beamLength, centerY + Math.sin(leftAngle) * beamLength);
    ctx.arc(centerX, centerY, beamLength, leftAngle, rightAngle);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(210, 255, 232, 0.72)";
    ctx.lineWidth = Math.max(1.5, cell * 0.14);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX + Math.cos(angle) * beamLength * 0.72, centerY + Math.sin(angle) * beamLength * 0.72);
    ctx.stroke();

    ctx.fillStyle = "rgba(210, 255, 232, 0.82)";
    ctx.beginPath();
    ctx.moveTo(centerX + Math.cos(angle) * beamLength * 0.82, centerY + Math.sin(angle) * beamLength * 0.82);
    ctx.lineTo(centerX + Math.cos(angle + 2.65) * cell * 0.42, centerY + Math.sin(angle + 2.65) * cell * 0.42);
    ctx.lineTo(centerX + Math.cos(angle - 2.65) * cell * 0.42, centerY + Math.sin(angle - 2.65) * cell * 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawMapDot(x0, y0, cell, x, y, color, radius) {
    const dotRadius = Math.max(2.5, cell * radius);
    ctx.save();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.92;
    ctx.beginPath();
    ctx.arc(x0 + x * cell, y0 + y * cell, dotRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "rgba(5, 10, 20, 0.75)";
    ctx.lineWidth = Math.max(1, cell * 0.12);
    ctx.stroke();
    ctx.restore();
  }

  function drawMapDiamond(x0, y0, cell, x, y, time) {
    const centerX = x0 + x * cell;
    const centerY = y0 + y * cell;
    const size = Math.max(5, cell * (1 + Math.sin(time * 5) * 0.06));

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.fillStyle = "rgba(255, 209, 102, 0.95)";
    ctx.strokeStyle = "rgba(5, 10, 20, 0.78)";
    ctx.lineWidth = Math.max(1, cell * 0.12);
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.78, -size * 0.18);
    ctx.lineTo(0, size);
    ctx.lineTo(-size * 0.78, -size * 0.18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(255, 255, 255, 0.48)";
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.72);
    ctx.lineTo(size * 0.3, -size * 0.14);
    ctx.lineTo(0, size * 0.22);
    ctx.lineTo(-size * 0.3, -size * 0.14);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function renderScreenGrade(width, height, time) {
    const vignette = ctx.createRadialGradient(width / 2, height * 0.52, height * 0.18, width / 2, height * 0.52, width * 0.68);
    vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
    vignette.addColorStop(0.76, "rgba(0, 0, 0, 0.12)");
    vignette.addColorStop(1, "rgba(0, 0, 0, 0.46)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = `rgba(85, 214, 255, ${0.025 + Math.sin(time * 0.8) * 0.008})`;
    ctx.fillRect(0, 0, width, height);

    const highlight = ctx.createLinearGradient(0, 0, width, height);
    highlight.addColorStop(0, "rgba(255, 255, 255, 0.06)");
    highlight.addColorStop(0.22, "rgba(255, 255, 255, 0)");
    highlight.addColorStop(1, "rgba(255, 209, 102, 0.035)");
    ctx.fillStyle = highlight;
    ctx.fillRect(0, 0, width, height);

    if (game.state === "caught") {
      renderCaughtCaptureOverlay(width, height, time);
    }
  }

  function renderCaughtCaptureOverlay(width, height, time) {
    const progress = clamp(game.caughtTime / CAUGHT_ANIMATION_DURATION, 0, 1);
    const pulse = 0.45 + Math.sin(time * 18) * 0.18;
    const sideCover = width * progress * 0.32;
    const topCover = height * progress * 0.16;

    ctx.save();
    ctx.fillStyle = `rgba(255, 47, 95, ${0.16 + progress * 0.28 + pulse * 0.08})`;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = `rgba(3, 6, 12, ${0.56 + progress * 0.28})`;
    ctx.fillRect(0, 0, sideCover, height);
    ctx.fillRect(width - sideCover, 0, sideCover, height);
    ctx.fillRect(0, 0, width, topCover);
    ctx.fillRect(0, height - topCover, width, topCover);

    const scanY = height * (0.24 + progress * 0.48);
    const scan = ctx.createLinearGradient(0, scanY - height * 0.05, 0, scanY + height * 0.05);
    scan.addColorStop(0, "rgba(255, 47, 95, 0)");
    scan.addColorStop(0.5, "rgba(255, 47, 95, 0.42)");
    scan.addColorStop(1, "rgba(255, 47, 95, 0)");
    ctx.fillStyle = scan;
    ctx.fillRect(0, scanY - height * 0.06, width, height * 0.12);

    drawGuardSilhouette(width * 0.5, height * (0.62 - progress * 0.08), height * (0.26 + progress * 0.22), progress);

    ctx.globalAlpha = 0.72 + progress * 0.28;
    ctx.fillStyle = "#ffd6df";
    ctx.font = `${Math.max(18, height * 0.035)}px Inter, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SECURITY LOCKDOWN", width / 2, height * 0.24);
    ctx.restore();
  }

  function drawGuardSilhouette(x, y, size, progress) {
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = 0.72 + progress * 0.22;
    ctx.fillStyle = "rgba(3, 6, 12, 0.92)";

    ctx.beginPath();
    ctx.arc(0, -size * 0.48, size * 0.16, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillRect(-size * 0.18, -size * 0.32, size * 0.36, size * 0.5);

    ctx.strokeStyle = "rgba(255, 214, 223, 0.52)";
    ctx.lineWidth = Math.max(3, size * 0.035);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-size * 0.15, -size * 0.2);
    ctx.lineTo(-size * (0.44 + progress * 0.16), size * 0.03);
    ctx.moveTo(size * 0.15, -size * 0.2);
    ctx.lineTo(size * (0.44 + progress * 0.16), size * 0.03);
    ctx.stroke();
    ctx.restore();
  }

  function normalizeAngle(angle) {
    while (angle < -Math.PI) angle += Math.PI * 2;
    while (angle > Math.PI) angle -= Math.PI * 2;
    return angle;
  }

  function lerpAngle(from, to, amount) {
    return from + normalizeAngle(to - from) * amount;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function update(dt, time) {
    if (game.state === "caught") {
      game.caughtTime += dt;
      if (game.caughtTime >= CAUGHT_ANIMATION_DURATION) {
        endGame("Game Over", game.caughtReason);
      } else {
        syncHud();
      }
      return;
    }
    if (game.state !== "playing") return;
    game.hurtCooldown = Math.max(0, game.hurtCooldown - dt);
    updatePlayer(dt, time);
    if (game.state !== "playing") return;
    updateGuards(dt);
    if (game.state !== "playing") return;
    if (game.hasDiamond) {
      game.escapeTime -= dt;
      if (game.escapeTime <= 0) {
        triggerCaughtAnimation("The alarm timer reached zero, and museum security caught you before you escaped.");
        return;
      }
    }
    updateUrgentAlarm(time);
    syncHud();
  }

  function loop(now) {
    const dt = Math.min(0.05, (now - lastFrame) / 1000);
    const time = now / 1000;
    lastFrame = now;
    update(dt, time);
    render(time);
    requestAnimationFrame(loop);
  }

  difficultyButtons.forEach((button) => {
    button.addEventListener("click", () => {
      selectedLevel = button.dataset.level;
      difficultyButtons.forEach((item) => item.classList.toggle("selected", item === button));
      game = createInitialGame(selectedLevel);
      syncHud();
    });
  });

  startButton.addEventListener("click", () => {
    void startGame();
  });
  restartButton.addEventListener("click", () => {
    stopUrgentAlarm();
    startOverlay.classList.remove("hidden");
    messageOverlay.classList.add("hidden");
    game = createInitialGame(selectedLevel);
    syncHud();
  });
  window.addEventListener("keydown", (event) => keys.add(event.key.toLowerCase()));
  window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));
  window.addEventListener("resize", resizeCanvas, { passive: true });
  window.addEventListener("contextmenu", (event) => event.preventDefault());

  window.MuseumTreasures = {
    getState: () => ({ ...game, map: undefined, config: { label: game.config.label, guardSpeed: game.config.guardSpeed } }),
    startGame,
    selectLevel: (level) => {
      if (!LEVELS[level]) throw new Error(`Unknown level: ${level}`);
      selectedLevel = level;
      stopUrgentAlarm();
      game = createInitialGame(selectedLevel);
      syncHud();
    }
  };

  resizeCanvas();
  syncHud();
  requestAnimationFrame(loop);
})();
