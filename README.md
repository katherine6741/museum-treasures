# Museum Treasures

Museum Treasures is a browser-based 3D museum maze game designed for the June 2026 IBL project at St. Stephen's College Preparatory School. Players enter a guarded museum, find the diamond, trigger the alarm, and race back to the exit before time runs out.

The project combines game design, spatial reasoning, touch interaction, and AI-assisted development into a playable learning experience for students.

## Live Demo

Play the latest deployed version:

```text
https://museum-treasures.pages.dev/
```

## Project Context

- School project: June 2026 IBL project, St. Stephen's College Preparatory School
- Primary creator and game designer: Katherine Leung
- Development style: Vibe coding with OpenAI Codex
- AI token sponsorship: Loretta Hao
- Technical guidance: CK Leung
- Target device: iPad Safari, with desktop browser support for testing

## Gameplay

1. Choose Easy, Medium, or Hard.
2. Use the left joystick to move through the museum.
3. Use the right joystick to look around, including up, down, left, and right.
4. Study the minimap, avoid guards and traps, and reach the diamond.
5. After collecting the diamond, escape through the blue Exit gate before the 45-second alarm timer reaches zero.

## Highlights

- Full-screen HTML5 Canvas rendering with a first-person museum maze view.
- iPad-friendly dual virtual joystick controls.
- Three difficulty levels with different maze layouts, traps, guards, and pacing.
- Museum-themed visuals including exhibit cases, statues, wall artwork, polished floors, ceiling treatment, and Exit signage.
- Security systems including blinking infrared lasers, retractable spikes, toxic waste, and patrolling guards.
- Guard line-of-sight chasing and a caught animation when the player fails to escape.
- Diamond objective, 45-second escape timer, final 10-second alarm sound, and adaptive background music.
- Minimap with player position and a direction beam showing the player's current facing direction.
- Static GitHub Pages-friendly structure with no build step required.

## Development Journey

Museum Treasures was developed through an iterative AI-assisted workflow. The project started from a student game concept: a museum treasure escape challenge with a diamond objective, guards, traps, and a time-limited escape. The implementation then evolved through repeated playtesting and refinement.

Key design decisions included:

- Turning the museum idea into a first-person maze so players could feel spatial tension instead of only seeing a flat map.
- Separating movement and camera controls into left-hand and right-hand joysticks for a more natural iPad experience.
- Making the minimap more useful by showing the player's current position and facing direction with a beam.
- Rebalancing difficulty levels so Easy is approachable, Medium adds meaningful traps, and Hard remains challenging but reachable.
- Improving the museum feeling with exhibit cases, statues, artwork, polished floors, ceiling color treatment, Exit signage, realistic security guards, and infrared-style lasers.
- Adding audio in stages: alarm beeps for urgency, then adaptive background music, then tuning the sound to remove unwanted drone noise.
- Keeping the project static and dependency-light so it can run easily in a browser and deploy cleanly to Cloudflare Pages or GitHub Pages.

This process reflects the IBL goal of moving from question and concept to prototype, testing, feedback, and final presentation.

## Technology

- HTML5
- CSS3
- Vanilla JavaScript
- Canvas 2D rendering
- Web Audio API for alarm and background music
- GitHub Pages-ready static deployment

## Files

- `index.html` - Game layout, HUD, start menu, overlays, and touch controls.
- `style.css` - Full-screen responsive styling for iPad and desktop browsers.
- `controls.js` - Virtual joystick control layer.
- `game.js` - Core game loop, maze state, hazards, guards, timer, audio, and rendering.
- `scripts/smoke-test.mjs` - Dependency-free smoke test for required game behavior.
- `scripts/local-server.mjs` - Local static server for previewing the game.
- `package-lock.json` - Lockfile used so `npm audit` can run consistently.

## Run Locally

```bash
npm start
```

Then open:

```text
http://localhost:4173
```

The game can also be opened directly from `index.html`, although the local server is recommended for testing.

## Test

```bash
npm test
npm audit --audit-level=high
```

The smoke test checks that required files exist, core gameplay behavior is wired in, and each level remains reachable.

## Deployment

The current Cloudflare Pages deployment is:

```text
https://museum-treasures.pages.dev/
```

This project is a static web game. To deploy with GitHub Pages or another static host, push the files to the `main` branch of:

```text
https://github.com/katherine6741/museum-treasures.git
```

Then enable GitHub Pages, Cloudflare Pages, or another static hosting service for the branch.

## Credits

Museum Treasures was developed as an AI-assisted educational game project.

- Primary creator and game designer: Katherine Leung
- Vibe coding development tool: OpenAI Codex
- AI token sponsor: Loretta Hao
- Technical guidance: CK Leung
- Educational application: June 2026 IBL project at St. Stephen's College Preparatory School
