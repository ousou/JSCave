# Browser JavaScript Port Plan

Latest update: 2026-07-20
Written by: Codex on behalf of Sebastian

## Goal

Port JavaCave to browser-native JavaScript while preserving the Java version's
appearance, 10 Hz game rhythm, controls, scoring, cave generation, collision
rules, and title/game/game-over flow. The finished game should open as a static
page without a build step, network access, third-party libraries, or installed
runtime dependencies.

## Investigated baseline

- `JavaCave.java` is the complete game. It has no image, audio, data, or network
  assets to migrate.
- The game draws into a 128 × 160 logical surface. The cave occupies the upper
  128 pixels and the score strip occupies the bottom 32 pixels.
- AWT calls the update logic approximately every 100 ms. The title animation,
  physics, score, cave narrowing, obstacle cadence, collision detection, death
  animation, and automatic return from game over are all tick-based.
- There are three states: title, game, and game over. Mouse-down or Space means
  thrust; release means fall. A fresh click latch prevents held input from
  accidentally skipping title and game-over screens.
- Gameplay uses random cave-direction changes and random obstacle positions.
  The Java source calls `Math.random()` directly, so deterministic Java replays
  do not currently exist.
- Rendering and state mutation are coupled in `OnPeriod()`. The browser port
  should separate them behind a tick API and an injectable random source while
  preserving the original order of mutations and draw operations.
- The repository has no test suite or JavaScript tooling. Java 21 compiles the
  current source with expected deprecation/removal warnings. Node.js 22 and
  headless Chrome are available in the current development environment.
- `AUTOMATION.md` documents Java title-screen capture through Xvfb and
  ImageMagick. That remains useful for reference captures, although Xvfb could
  not open its display inside the current restricted sandbox.

## Proposed design

Use a logical 128 × 160 `<canvas>` and classic browser scripts so the page works
when opened directly with a `file:` URL as well as from any static web server.
Keep the simulation independent from the DOM and Canvas API:

- a deterministic engine owns state, accepts pressed/released input, consumes
  one injected random value at a time, and advances exactly one 100 ms tick;
- the engine emits or exposes the data needed to reproduce the Java drawing
  order, including the scrolling cave buffer and player trail;
- a canvas renderer applies those drawing operations to an off-screen logical
  canvas and presents it with nearest-neighbor integer scaling;
- a small browser controller translates pointer and Space events, manages the
  timer, releases stuck input on focus loss, and starts from the title state;
- test-only code injects a seeded or scripted random source and a fake clock,
  without changing production defaults.

The proposed source layout is `index.html`, `styles.css`, `src/engine.js`,
`src/renderer.js`, and `src/main.js`. Node's built-in test runner will load the
engine and renderer through small dependency-free exports. A browser test page
and shell/Node runner will exercise the same production files in headless
Chrome. This layout is pending the single-file delivery decision below.

## Assumptions and non-goals

- "No dependencies" applies to the shipped game. The implementation will also
  avoid third-party test packages; automated browser checks may require a
  locally installed Chrome/Chromium executable.
- The existing Java version remains in the repository as the historical and
  behavioral reference until parity work is complete.
- The port preserves the original in-memory high score: reloading the page
  resets it. Persistent scores, accounts, networking, audio, new levels, and
  altered difficulty are out of scope.
- Pointer events will cover mouse, pen, and touch while retaining the original
  Space control. Touch support does not change the game rules.
- The Java palette, dimensions, serif typography, wording, coordinates, and
  nearest-neighbor enlargement are the visual target. Exact font rasterization
  across operating systems is not assumed unless the fidelity decision below
  requires a bundled font or bitmap text.
- Production code will not depend on test query parameters or expose mutable
  debug controls. Test pages may opt into a documented test hook before loading
  the controller.

## Implementation checklist

### 1. Record the Java behavior as an executable specification

- [ ] Add a concise behavior/parity document that transcribes every constant,
  initial value, state transition, tick order, random-number consumption point,
  draw coordinate, collision boundary, scoring rule, and restart latch from
  `JavaCave.java`; explicitly note Java integer truncation and inclusive
  comparisons that JavaScript must reproduce.
- [ ] Add table-driven characterization cases for title-to-game, acceleration
  clamps, cave movement bounds, every-10-ticks narrowing/obstacle creation,
  safe and colliding obstacle edges, score increments, death animation timing,
  high-score promotion, click-to-restart, and the 100-tick automatic return.
- [ ] Compile the unchanged Java source with `javac -Xlint:all JavaCave.java`
  and, where the environment permits, capture reference title screens at 1×
  and 4× using `AUTOMATION.md`; record expected warnings and capture dimensions.
- [ ] Commit the verified specification, characterization fixtures, and any
  reference captures as one baseline change.

### 2. Add a zero-runtime-dependency browser shell

- [ ] Add a failing smoke check that loads the page from both a `file:` URL and
  a minimal local HTTP server, verifies there are no external requests, and
  expects a 128 × 160 canvas with an accessible game label and control help.
- [ ] Add the static HTML/CSS/script structure, a centered canvas, a useful page
  title, keyboard-focus behavior, and a no-script message; do not add a package
  manager dependency, bundler, CDN link, web font, or service worker.
- [ ] Implement integer nearest-neighbor presentation scaling from 1× through
  16×, choosing the largest size that fits the viewport and recomputing it on
  resize while keeping the canvas's backing dimensions exactly 128 × 160.
- [ ] Run the file/HTTP smoke checks in headless Chrome and validate at least
  two viewport sizes, the 8:10 aspect ratio, and non-blurred canvas CSS.
- [ ] Commit the verified static browser shell.

### 3. Port the deterministic state machine and input latch

- [ ] Add failing Node tests for initial title state, tick counters, mouse/
  pointer press and release, Space press and release, combined inputs, the
  fresh-click latch, title-to-game transition, and state counter reset.
- [ ] Implement the dependency-free engine state container and input API,
  preserving Java's state names, first-tick initialization semantics, and
  transition ordering while giving JavaScript fields descriptive names.
- [ ] Run the state/input unit tests and the browser smoke check.
- [ ] Commit the verified state machine and input-latch port.

### 4. Port flight physics, cave generation, scoring, and collisions

- [ ] Add failing unit tests for thrust/fall acceleration, velocity limits
  `-8...8`, vertical position updates, `Score += 3`, the 32 four-pixel cave
  columns, initial opening, cave-width decrement, random movement changes,
  upper/lower cave reflection, column scrolling, and obstacle placement.
- [ ] Add a scripted-random test double that asserts not only resulting values
  but the exact number and order of random draws on each tick.
- [ ] Implement one-tick gameplay advancement with explicit Java-compatible
  numeric conversion where `(int)` truncation matters.
- [ ] Add failing boundary tests for the player center at the top and bottom
  opening edges and immediately outside them, plus obstacle top/bottom edges
  and interior pixels at collision column 8.
- [ ] Implement collision detection exactly as the Java boolean expression,
  including its edge inclusivity, and transition to game over only after the
  collision tick's score and cave updates have occurred.
- [ ] Run the complete engine suite with fixed random sequences and add a
  multi-hundred-tick replay checksum so accidental changes to difficulty,
  random consumption, or tick ordering are detected.
- [ ] Commit the verified gameplay simulation.

### 5. Port title, cave, player, score, and game-over rendering

- [ ] Add a recording Canvas-context test double and failing tests for the
  ordered drawing commands, colors, fonts, coordinates, line widths, text, and
  per-state layers on representative ticks.
- [ ] Implement the 128 × 160 off-screen canvas renderer, including title pulse
  and randomized blue component, initial striped cave, four-pixel scrolling,
  obstacles, three-line player trail, score strip, expanding red death rings,
  `GameOver`, and conditional `HiScore!!`.
- [ ] Preserve Java `copyArea` semantics with a scratch buffer or an equivalent
  verified full redraw so overlapping self-copy behavior does not vary between
  browsers.
- [ ] Add real-browser pixel tests for stable non-text landmarks and palette
  colors in title, initial game, mid-game, collision, and game-over frames;
  keep font-sensitive checks at the command/metric level unless a fixed font
  strategy is selected.
- [ ] Add deterministic browser screenshots for review and an automated
  tolerance/checksum policy that ignores known platform font rasterization
  differences while still catching layout, palette, and scaling regressions.
- [ ] Run Node renderer tests and browser pixel/screenshot tests at 1× and 4×.
- [ ] Commit the verified canvas rendering port and approved reference images.

### 6. Connect production timing and browser controls

- [ ] Add failing controller tests with a fake scheduler for a 100 ms cadence,
  start/stop idempotence, no duplicate timers, and deterministic one-tick
  advancement.
- [ ] Add failing browser tests that dispatch pointer down/up/cancel and Space
  down/up, verify Space does not scroll the page, verify pointer focus, and
  verify input is released on window blur or page visibility loss.
- [ ] Implement the controller using browser timers and Pointer Events, connect
  it to the engine and renderer, and use pointer capture where supported so a
  release outside the canvas cannot leave thrust stuck.
- [ ] Add a scripted end-to-end replay that starts from the title through real
  DOM events, flies for several ticks, deliberately collides, observes the
  death animation and score, returns to the title by click, and separately
  verifies the automatic timeout path.
- [ ] Run all unit, browser integration, and deterministic replay tests.
- [ ] Commit the verified playable browser integration.

### 7. Harden compatibility and standalone delivery

- [ ] Add automated checks for current Chrome and one additional browser engine
  when available, plus a clear skip result when the optional executable is not
  installed.
- [ ] Test direct-file launch with networking disabled and assert that gameplay
  still starts, proving all runtime resources are local and no server is
  required.
- [ ] Test keyboard-only and pointer-only complete state cycles, rapid input
  changes, resize during play, background/foreground transitions, and a narrow
  viewport without changing logical game state or canvas pixels.
- [ ] If a single-file artifact is selected, add a deterministic standard-
  library-only packaging script that inlines the verified CSS and JavaScript
  into a distributable HTML file, then test that artifact with the same browser
  suite and verify it makes no external requests.
- [ ] Run the full automated suite repeatedly with fixed seeds to rule out
  flaky timing and random failures.
- [ ] Commit the verified compatibility and standalone-delivery work.

### 8. Make the browser port the documented primary experience

- [ ] Update `README.md` with direct-open and optional local-server instructions,
  controls, supported browsers, logical/display sizing, project structure, and
  the distinction between runtime-free play and development test prerequisites.
- [ ] Replace or extend `AUTOMATION.md` with one-command Node/unit/browser test
  instructions, deterministic screenshot regeneration, golden review rules,
  and a short Java-versus-browser parity checklist for release review.
- [ ] Ensure every new document or code-file authorship comment that names a
  writer says `Codex on behalf of Sebastian`.
- [ ] From a clean checkout, run the documented full suite, direct-file smoke
  test, local-server smoke test, Java reference compilation, and artifact
  integrity/no-network check.
- [ ] Commit the verified documentation and release instructions.

## Acceptance criteria

- Opening the delivered HTML directly in a supported browser starts at a
  faithful JavaCave/SFCave title screen with no server, install, build, network,
  console error, or third-party runtime code.
- Pointer/touch hold and Space hold produce the same acceleration, score,
  procedural cave behavior, collisions, game-over flow, and restart behavior as
  `JavaCave.java` at one simulation tick per 100 ms.
- The canvas always has a 128 × 160 logical backing store and uses crisp
  nearest-neighbor enlargement without changing simulation results on resize.
- Seeded engine replays, renderer command tests, browser pixel checks, DOM input
  tests, and full state-cycle tests all pass through documented commands.
- The Java reference continues to compile, and the repository contains no
  generated dependency directory or required runtime outside standard browser
  APIs and local project files.

## Open questions for clarification

1. Should the final delivery be one self-contained HTML file, or may it be a
   small static folder? Recommended: keep maintainable source files and generate
   a tested single-file `javacave.html` release artifact.
2. Does "same look and feel" mean pixel-identical output on one named reference
   platform, or faithful dimensions/palette/layout with normal cross-platform
   serif-font differences? Recommended: faithful cross-platform rendering with
   pixel-exact tests for geometry and non-text colors, avoiding a bundled font.
3. Should the legacy Java source and its instructions remain alongside the
   browser version after the port? Recommended: retain them under a clearly
   labeled legacy/reference section so parity can be audited later.
