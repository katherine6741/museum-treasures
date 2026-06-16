(function () {
  "use strict";

  const TILE = 1;
  const PLAYER_RADIUS = 0.18;
  const BASE_SPEED = 2.35;
  const TURN_SPEED = 2.45;
  const LOOK_PITCH_SPEED = 1.45;
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
      guards: [{ x: 10.5, y: 9.5, path: [[10.5, 9.5], [8.5, 9.5], [8.5, 7.5]] }]
    },
    medium: {
      label: "Medium",
      guardSpeed: 1.5,
      map: [
        "111111111111111",
        "1E0001000000001",
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
        { type: "laser", x: 10, y: 9 },
        { type: "waste", x: 6, y: 7 },
        { type: "waste", x: 11, y: 3 }
      ],
      guards: [
        { x: 12.5, y: 11.5, path: [[12.5, 11.5], [9.5, 11.5], [9.5, 9.5]] },
        { x: 3.5, y: 9.5, path: [[3.5, 9.5], [5.5, 9.5], [5.5, 11.5]] }
      ]
    },
    hard: {
      label: "Hard",
      guardSpeed: 2.2,
      map: [
        "11111111111111111",
        "1E000001000000001",
        "10111110101111101",
        "10000010101000101",
        "11111010101010101",
        "10001000100010101",
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
      player: { x: parsed.exit.x + 0.5, y: parsed.exit.y + 0.5, angle: 0, pitch: 0 },
      playerHearts: 3,
      hasDiamond: false,
      escapeTime: 20,
      state: "ready",
      hurtCooldown: 0,
      wasteTick: 0,
      hazards: config.hazards.map((hazard) => ({ ...hazard, lastHit: -99 })),
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

  function startGame() {
    game = createInitialGame(selectedLevel);
    game.state = "playing";
    startOverlay.classList.add("hidden");
    messageOverlay.classList.add("hidden");
    syncHud();
  }

  function endGame(title, text) {
    game.state = title === "Treasure Escaped" ? "won" : "lost";
    messageTitle.textContent = title;
    messageText.textContent = text;
    messageOverlay.classList.remove("hidden");
    syncHud();
  }

  function syncHud() {
    hearts.textContent = Array.from({ length: 3 }, (_, index) => index < game.playerHearts ? "❤️" : "♡").join(" ");
    levelName.textContent = game.config.label;
    alarm.textContent = `ALARM ${Math.max(0, game.escapeTime).toFixed(2)}`;
    alarm.classList.toggle("hidden", !game.hasDiamond);
    stateLabel.textContent = getStateText();
  }

  function getStateText() {
    if (game.state === "ready") return "Choose a difficulty";
    if (game.state === "won") return "Escaped with the diamond";
    if (game.state === "lost") return "Heist failed";
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
    const keyboardPitch = (keys.has("e") ? -1 : 0) + (keys.has("q") ? 1 : 0);
    const forwardInput = Math.abs(moveStick.y) > 0.05 ? moveStick.y : keyboardForward;
    const strafeInput = Math.abs(moveStick.x) > 0.05 ? moveStick.x : keyboardStrafe;
    const turnInput = Math.abs(lookStick.x) > 0.05 ? lookStick.x : keyboardTurn;
    const pitchInput = Math.abs(lookStick.y) > 0.05 ? lookStick.y : keyboardPitch;
    const speedModifier = currentWasteHazard() ? 0.5 : 1;
    const forwardAmount = -forwardInput * BASE_SPEED * speedModifier * dt;
    const strafeAmount = strafeInput * BASE_SPEED * speedModifier * dt;

    game.player.angle += turnInput * TURN_SPEED * dt;
    game.player.pitch = clamp(game.player.pitch + pitchInput * LOOK_PITCH_SPEED * dt, -0.34, 0.34);
    tryMove(
      game.player,
      Math.cos(game.player.angle) * forwardAmount + Math.cos(game.player.angle + Math.PI / 2) * strafeAmount,
      Math.sin(game.player.angle) * forwardAmount + Math.sin(game.player.angle + Math.PI / 2) * strafeAmount
    );

    if (distanceToTile(game.player, game.diamond) < 0.48 && !game.hasDiamond) {
      game.hasDiamond = true;
      game.escapeTime = 20;
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
    const horizon = height * (0.48 + game.player.pitch);

    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, "#101b33");
    sky.addColorStop(1, "#263c5d");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, horizon);

    const floor = ctx.createLinearGradient(0, horizon, 0, height);
    floor.addColorStop(0, "#22283a");
    floor.addColorStop(1, "#080b13");
    ctx.fillStyle = floor;
    ctx.fillRect(0, horizon, width, height - horizon);

    const columns = Math.min(width, 520);
    const columnWidth = width / columns;
    const depthBuffer = [];
    for (let i = 0; i < columns; i += 1) {
      const cameraX = i / columns - 0.5;
      const angle = game.player.angle + cameraX * FOV;
      const hit = castRay(angle);
      const corrected = hit.distance * Math.cos(angle - game.player.angle);
      const wallHeight = Math.min(height, height / Math.max(0.001, corrected));
      const shade = Math.max(34, 210 - corrected * 26);
      const x = i * columnWidth;
      const y = horizon - wallHeight / 2;
      ctx.fillStyle = hit.side === "x" ? `rgb(${shade},${Math.floor(shade * 0.78)},${Math.floor(shade * 0.48)})` : `rgb(${Math.floor(shade * 0.56)},${Math.floor(shade * 0.69)},${shade})`;
      ctx.fillRect(x, y, Math.ceil(columnWidth) + 1, wallHeight);
      if (corrected < 2.5) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
        ctx.fillRect(x, y, Math.ceil(columnWidth) + 1, 4);
      }
      depthBuffer[i] = corrected;
    }

    renderWorldObjects(depthBuffer, time);
    renderMinimap(time);
  }

  function renderWorldObjects(depthBuffer, time) {
    const objects = [];
    if (!game.hasDiamond) objects.push({ type: "diamond", x: game.diamond.x + 0.5, y: game.diamond.y + 0.5 });
    objects.push({ type: "exit", x: game.exit.x + 0.5, y: game.exit.y + 0.5 });
    for (const hazard of game.hazards) objects.push({ ...hazard, x: hazard.x + 0.5, y: hazard.y + 0.5 });
    for (const guard of game.guards) objects.push({ type: guard.chase ? "guard-alert" : "guard", x: guard.x, y: guard.y });

    objects.sort((a, b) => Math.hypot(b.x - game.player.x, b.y - game.player.y) - Math.hypot(a.x - game.player.x, a.y - game.player.y));
    for (const object of objects) {
      const dx = object.x - game.player.x;
      const dy = object.y - game.player.y;
      const distance = Math.hypot(dx, dy);
      const angleToObject = normalizeAngle(Math.atan2(dy, dx) - game.player.angle);
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
    if (type === "laser") return 0.85;
    if (type === "waste" || type === "spike") return 0.5;
    return 0.8;
  }

  function drawSprite(object, x, floorY, size, time) {
    ctx.save();
    ctx.translate(x, floorY);
    if (object.type === "diamond") {
      ctx.rotate(Math.sin(time * 2.4) * 0.1);
      ctx.fillStyle = "#9df3ff";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = Math.max(2, size * 0.03);
      polygon([[0, -size * 0.62], [size * 0.36, -size * 0.18], [0, size * 0.36], [-size * 0.36, -size * 0.18]], true);
      ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
      polygon([[0, -size * 0.5], [size * 0.16, -size * 0.18], [0, 0], [-size * 0.16, -size * 0.18]], true);
    } else if (object.type === "exit") {
      ctx.fillStyle = "rgba(85, 214, 255, 0.28)";
      ctx.fillRect(-size * 0.36, -size * 0.9, size * 0.72, size * 1.2);
      ctx.strokeStyle = "#55d6ff";
      ctx.lineWidth = Math.max(3, size * 0.04);
      ctx.strokeRect(-size * 0.36, -size * 0.9, size * 0.72, size * 1.2);
    } else if (object.type === "laser") {
      ctx.globalAlpha = isLaserActive(time) ? 1 : 0.22;
      ctx.strokeStyle = "#ff2f5f";
      ctx.lineWidth = Math.max(5, size * 0.08);
      ctx.beginPath();
      ctx.moveTo(-size * 0.42, -size * 0.35);
      ctx.lineTo(size * 0.42, -size * 0.72);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-size * 0.42, -size * 0.05);
      ctx.lineTo(size * 0.42, -size * 0.42);
      ctx.stroke();
    } else if (object.type === "waste") {
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
    } else {
      ctx.fillStyle = object.type === "guard-alert" ? "#ff2f5f" : "#f7f1e3";
      ctx.fillRect(-size * 0.22, -size * 0.68, size * 0.44, size * 0.74);
      ctx.fillStyle = object.type === "guard-alert" ? "#ffd166" : "#203650";
      ctx.beginPath();
      ctx.arc(0, -size * 0.78, size * 0.18, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function polygon(points, stroke) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i][0], points[i][1]);
    ctx.closePath();
    ctx.fill();
    if (stroke) ctx.stroke();
  }

  function renderMinimap(time) {
    const size = Math.min(canvas.width * 0.2, 168);
    const pixelRatio = window.devicePixelRatio || 1;
    const pad = 16 * pixelRatio;
    const bottomLift = 76 * pixelRatio;
    const cell = size / Math.max(game.width, game.height);
    const x0 = (canvas.width - size) / 2;
    const y0 = canvas.height - size - pad - bottomLift;

    ctx.fillStyle = "rgba(5, 10, 20, 0.62)";
    ctx.fillRect(x0 - 8, y0 - 8, size + 16, size + 16);
    for (let y = 0; y < game.height; y += 1) {
      for (let x = 0; x < game.width; x += 1) {
        ctx.fillStyle = game.map[y][x] ? "rgba(255, 255, 255, 0.3)" : "rgba(255, 255, 255, 0.06)";
        ctx.fillRect(x0 + x * cell, y0 + y * cell, cell - 1, cell - 1);
      }
    }

    drawMapDot(x0, y0, cell, game.exit.x + 0.5, game.exit.y + 0.5, "#55d6ff", 2.3);
    if (!game.hasDiamond) drawMapDot(x0, y0, cell, game.diamond.x + 0.5, game.diamond.y + 0.5, "#ffd166", 2.4 + Math.sin(time * 5) * 0.5);
    for (const guard of game.guards) drawMapDot(x0, y0, cell, guard.x, guard.y, guard.chase ? "#ff2f5f" : "#ffffff", 2);
    drawMapDot(x0, y0, cell, game.player.x, game.player.y, "#45e394", 2.4);
  }

  function drawMapDot(x0, y0, cell, x, y, color, radius) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x0 + x * cell, y0 + y * cell, Math.max(2, cell * radius), 0, Math.PI * 2);
    ctx.fill();
  }

  function normalizeAngle(angle) {
    while (angle < -Math.PI) angle += Math.PI * 2;
    while (angle > Math.PI) angle -= Math.PI * 2;
    return angle;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function update(dt, time) {
    if (game.state !== "playing") return;
    game.hurtCooldown = Math.max(0, game.hurtCooldown - dt);
    updatePlayer(dt, time);
    if (game.state !== "playing") return;
    updateGuards(dt);
    if (game.state !== "playing") return;
    if (game.hasDiamond) {
      game.escapeTime -= dt;
      if (game.escapeTime <= 0) {
        endGame("Game Over", "The alarm timer reached zero before you escaped.");
      }
    }
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

  startButton.addEventListener("click", startGame);
  restartButton.addEventListener("click", () => {
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
      game = createInitialGame(selectedLevel);
      syncHud();
    }
  };

  resizeCanvas();
  syncHud();
  requestAnimationFrame(loop);
})();
