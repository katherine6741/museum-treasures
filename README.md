# Museum Treasures

Museum Treasures is a full-screen HTML5 3D maze game built for iPad Safari and GitHub Pages. Players explore a museum maze, collect the center diamond, trigger a 45-second alarm, and race back to the blue exit gate while avoiding guards and traps.

## How to Play

1. Open `index.html` in a browser or serve the folder with a local static server.
2. Choose Easy, Medium, or Hard.
3. Use the bottom-left virtual joystick on iPad. Desktop arrow keys or WASD also work for testing.
4. Reach the diamond, then escape through the blue gate before the alarm timer reaches zero.

## Game Features

- First-person 3D maze rendering with a responsive HTML5 canvas.
- iPad-ready touch joystick with no keyboard or mouse dependency.
- Three difficulty modes with increasing guard speed, hazard density, and maze complexity.
- Blinking lasers, toxic waste, retractable spikes, structural dead ends, and patrolling guards.
- Guard line-of-sight chasing and instant defeat on player collision.
- Three-heart health system for hazards.
- Urgent generated alarm beeps during the final 10 seconds after the diamond is taken.
- GitHub Pages-ready static files with no build step.

## Files

- `index.html` — Game layout, HUD, start menu, and overlays.
- `style.css` — Full-screen responsive iPad styling and touch-safe UI.
- `controls.js` — Virtual joystick control layer.
- `game.js` — Core loop, maze state, hazards, guards, timer, and rendering.
- `scripts/smoke-test.mjs` — Dependency-free project smoke test.

## Smoke Test

Run:

```bash
npm test
```

The smoke test checks that required files exist and that the main game behaviors are wired into the source.

## Deployment

This project is static. Push the files to the `main` branch of `https://github.com/katherine6741/museum-treasures.git`, then enable GitHub Pages for the branch if it is not already enabled.
