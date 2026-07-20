# Browser JavaScript Port Plan

Latest update: 2026-07-20
Written by: Codex on behalf of Sebastian

Completion evidence and the final release gates are tracked in
[`browser_port_completion.md`](browser_port_completion.md). Checklist items
below are checked only where the completion tests or captured references now
provide evidence.

## Goal

Port JavaCave to browser-native JavaScript while preserving the Java version's
appearance, 10 Hz game rhythm, controls, scoring, cave generation, collision
rules, and title/game/game-over flow. The finished game should open as a static
page without a build step, network access, third-party libraries, or installed
runtime dependencies. Maintainable source files will also produce one tested,
self-contained `javacave.html` release artifact.

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
  ImageMagick. A permitted retry outside the restricted display sandbox
  successfully captured the expected 512 × 640 title screen at 4× scale; the
  initial failure was environmental rather than a JavaCave rendering failure.

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
- a pure scaling policy defaults to the largest fitting integer scale but also
  accepts an explicit 1×...16× mode for deterministic captures and, later, a
  user-visible scale selector;
- test-only code injects a seeded or scripted random source and a fake clock,
  without changing production defaults.

The proposed source layout is `index.html`, `styles.css`, `src/engine.js`,
`src/renderer.js`, and `src/main.js`. Node's built-in test runner will load the
engine and renderer through small dependency-free exports. A browser test page
and shell/Node runner will exercise the same production files in headless
Chrome. A deterministic standard-library-only packaging script will inline the
verified source into `javacave.html`, and the same browser suite will test both
the source page and that release artifact.

## Assumptions and non-goals

- "No dependencies" applies to the shipped game. The implementation will also
  avoid third-party test packages; automated browser checks may require a
  locally installed Chrome/Chromium executable.
- The existing Java version will remain in the repository as a clearly labeled
  historical and behavioral reference after the browser port becomes primary.
- The port preserves the original in-memory high score: reloading the page
  resets it. Persistent scores, accounts, networking, audio, new levels, and
  altered difficulty are out of scope.
- Pointer events will cover mouse, pen, and touch while retaining the original
  Space control. Touch support does not change the game rules.
- Display scaling defaults to `Auto`. After the normally playable version is
  complete, an accessible selector will allow `Auto` or a forced 1×...16×
  scale. A forced size remains fixed across window resizes and may make the page
  scroll when it is larger than the viewport; reloading returns to `Auto`.
- The Java palette, dimensions, serif typography, wording, coordinates, and
  nearest-neighbor enlargement are the visual target. Normal serif-font
  rasterization differences across operating systems are acceptable; geometry
  and non-text palette output remain pixel-exact targets, and no font is bundled.
- Production code will not depend on test query parameters or expose mutable
  debug controls. Test pages may opt into a documented test hook before loading
  the controller.

## Implementation checklist

### 1. Record the Java behavior as an executable specification

- [x] Add a concise behavior/parity document that transcribes every constant,
  initial value, state transition, tick order, random-number consumption point,
  draw coordinate, collision boundary, scoring rule, and restart latch from
  `JavaCave.java`; explicitly note Java integer truncation and inclusive
  comparisons that JavaScript must reproduce.
- [x] Add table-driven characterization cases for title-to-game, acceleration
  clamps, cave movement bounds, every-10-ticks narrowing/obstacle creation,
  safe and colliding obstacle edges, score increments, death animation timing,
  high-score promotion, click-to-restart, and the 100-tick automatic return.
- [x] Compile the unchanged Java source with `javac -Xlint:all JavaCave.java`
  and, where the environment permits, capture reference title screens at 1×
  and 4× using `AUTOMATION.md`; record expected warnings and capture dimensions.
- [x] Commit the verified specification, characterization fixtures, and any
  reference captures as one baseline change.

### 2. Add a zero-runtime-dependency browser shell

- [x] Add a failing smoke check that loads the page from both a `file:` URL and
  a minimal local HTTP server, verifies there are no external requests, and
  expects a 128 × 160 canvas with an accessible game label and control help.
- [x] Add the static HTML/CSS/script structure, a centered canvas, a useful page
  title, keyboard-focus behavior, and a no-script message; do not add a package
  manager dependency, bundler, CDN link, web font, or service worker.
- [x] Add failing unit tests for a pure scaling policy: `Auto` chooses the
  largest fitting integer from 1× through 16×, explicit 1×...16× modes ignore
  viewport resizing, invalid values are rejected, and every mode leaves the
  canvas backing dimensions at exactly 128 × 160.
- [x] Implement the tested scaling policy and nearest-neighbor presentation.
  Start the production page in `Auto`, but allow the test harness/controller to
  request a fixed scale before the visible selector is added in step 7.
- [x] Run the file/HTTP smoke checks in headless Chrome and validate at least
  two viewport sizes, forced 1× and 4× output, the 8:10 aspect ratio, and
  non-blurred canvas CSS.
- [x] Commit the verified static browser shell.

### 3. Port the deterministic state machine and input latch

- [x] Add failing Node tests for initial title state, tick counters, mouse/
  pointer press and release, Space press and release, combined inputs, the
  fresh-click latch, title-to-game transition, and state counter reset.
- [x] Implement the dependency-free engine state container and input API,
  preserving Java's state names, first-tick initialization semantics, and
  transition ordering while giving JavaScript fields descriptive names.
- [x] Run the state/input unit tests and the browser smoke check.
- [x] Commit the verified state machine and input-latch port.

### 4. Port flight physics, cave generation, scoring, and collisions

- [x] Add failing unit tests for thrust/fall acceleration, velocity limits
  `-8...8`, vertical position updates, `Score += 3`, the 32 four-pixel cave
  columns, initial opening, cave-width decrement, random movement changes,
  upper/lower cave reflection, column scrolling, and obstacle placement.
- [x] Add a scripted-random test double that asserts not only resulting values
  but the exact number and order of random draws on each tick.
- [x] Implement one-tick gameplay advancement with explicit Java-compatible
  numeric conversion where `(int)` truncation matters.
- [x] Add failing boundary tests for the player center at the top and bottom
  opening edges and immediately outside them, plus obstacle top/bottom edges
  and interior pixels at collision column 8.
- [x] Implement collision detection exactly as the Java boolean expression,
  including its edge inclusivity, and transition to game over only after the
  collision tick's score and cave updates have occurred.
- [x] Run the complete engine suite with fixed random sequences and add a
  multi-hundred-tick replay checksum so accidental changes to difficulty,
  random consumption, or tick ordering are detected.
- [x] Commit the verified gameplay simulation.

### 5. Port title, cave, player, score, and game-over rendering

- [x] Correct the browser player trail so each game frame draws the Java
  three-line worm from the preceding `oy` to the new `y`, rather than replacing
  it with a horizontal pixel at the current position.
- [x] Rasterize the three worm lines as opaque logical pixels so browser Canvas
  anti-aliasing cannot soften the Java AWT `drawLine` sprite.

- [x] Add a recording Canvas-context test double and failing tests for the
  ordered drawing commands, colors, fonts, coordinates, line widths, text, and
  per-state layers on representative ticks.
- [x] Implement the 128 × 160 off-screen canvas renderer, including title pulse
  and randomized blue component, initial striped cave, four-pixel scrolling,
  obstacles, three-line player trail, score strip, expanding red death rings,
  `GameOver`, and conditional `HiScore!!`.
- [x] Preserve Java `copyArea` semantics with a scratch buffer or an equivalent
  verified full redraw so overlapping self-copy behavior does not vary between
  browsers.
- [x] Add real-browser pixel tests for stable non-text landmarks and palette
  colors in title, initial game, mid-game, collision, and game-over frames;
  keep font-sensitive checks at the command/metric level.
- [x] Add deterministic browser screenshots for review and an automated
  tolerance/checksum policy that ignores known platform font rasterization
  differences while still catching layout, palette, and scaling regressions.
- [x] Run Node renderer tests and browser pixel/screenshot tests through the
  scaling policy's forced 1× and 4× modes so their dimensions are independent
  of the test runner's window size.
- [x] Commit the verified canvas rendering port and approved reference images.

### 6. Connect production timing and browser controls

- [x] Add failing controller tests with a fake scheduler for a 100 ms cadence,
  start/stop idempotence, no duplicate timers, and deterministic one-tick
  advancement.
- [x] Add failing browser tests that dispatch pointer down/up/cancel and Space
  down/up, verify Space does not scroll the page, verify pointer focus, and
  verify input is released on window blur or page visibility loss.
- [x] Implement the controller using browser timers and Pointer Events, connect
  it to the engine and renderer, and use pointer capture where supported so a
  release outside the canvas cannot leave thrust stuck.
- [x] Add a scripted end-to-end replay that starts from the title through real
  DOM events, flies for several ticks, deliberately collides, observes the
  death animation and score, returns to the title by click, and separately
  verifies the automatic timeout path.
- [x] Run all unit, browser integration, and deterministic replay tests.
- [x] Commit the verified playable browser integration.

### 7. Harden compatibility and standalone delivery

- [x] Add failing browser tests for an accessible scale selector containing
  `Auto` and every integer from 1× through 16×; verify forced 1× reproduces the
  128 × 160 Java reference size, a forced size survives window resizing, `Auto`
  resumes fit-to-window behavior, oversized forced output scrolls instead of
  silently shrinking, and changing scale never resets gameplay.
- [x] Add the visible scale selector and connect it to the already-tested
  scaling policy without changing the default `Auto` behavior.
- [x] Run the scale-policy unit tests, browser selector tests, 1× Java/browser
  comparison capture, and existing gameplay suite.
- [x] Commit the verified manual scaling control.
- [x] Add automated checks for current Chrome and one additional browser engine
  when available, plus a clear skip result when the optional executable is not
  installed.
- [x] Test direct-file launch with networking disabled and assert that gameplay
  still starts, proving all runtime resources are local and no server is
  required.
- [x] Test keyboard-only and pointer-only complete state cycles, rapid input
  changes, resize during play, background/foreground transitions, and a narrow
  viewport without changing logical game state or canvas pixels.
- [x] Add a deterministic standard-library-only packaging script that inlines
  the verified CSS and JavaScript into a distributable `javacave.html`, then
  test that artifact with the same browser suite and verify it makes no external
  requests.
- [x] Run the full automated suite repeatedly with fixed seeds to rule out
  flaky timing and random failures.
- [x] Commit the verified compatibility and standalone-delivery work.

### 8. Make the browser port the documented primary experience

- [x] Update `README.md` with direct-open and optional local-server instructions,
  controls, supported browsers, logical/display sizing, project structure, and
  the distinction between runtime-free play and development test prerequisites.
- [x] Replace or extend `AUTOMATION.md` with one-command Node/unit/browser test
  instructions, deterministic screenshot regeneration, golden review rules,
  and a short Java-versus-browser parity checklist for release review.
- [x] Ensure every new document or code-file authorship comment that names a
  writer says `Codex on behalf of Sebastian`.
- [x] From a clean checkout, run the documented full suite, direct-file smoke
  test, local-server smoke test, Java reference compilation, and artifact
  integrity/no-network check.
- [x] Commit the verified documentation and release instructions.

## Acceptance criteria

- Opening the delivered `javacave.html` directly in a supported browser starts
  at a faithful JavaCave/SFCave title screen with no server, install, build,
  network, console error, or third-party runtime code.
- Pointer/touch hold and Space hold produce the same acceleration, score,
  procedural cave behavior, collisions, game-over flow, and restart behavior as
  `JavaCave.java` at one simulation tick per 100 ms.
- The canvas always has a 128 × 160 logical backing store and uses crisp
  nearest-neighbor enlargement without changing simulation results on resize.
- `Auto` chooses the largest fitting integer display scale, while the visible
  selector can force any scale from 1× through 16× without changing or
  restarting game state.
- Seeded engine replays, renderer command tests, browser pixel checks, DOM input
  tests, and full state-cycle tests all pass through documented commands.
- The Java reference continues to compile, and the repository contains no
  generated dependency directory or required runtime outside standard browser
  APIs and local project files.

## Clarification decisions

Confirmed by Sebastian on 2026-07-20:

- Keep maintainable source files and generate a tested, self-contained
  `javacave.html` release artifact.
- Target faithful cross-platform dimensions, palette, layout, animation, and
  gameplay. Test geometry and non-text colors pixel-exactly, but accept normal
  platform serif-font rasterization differences and do not bundle a font.
- Retain the Java source and instructions as a clearly labeled legacy/reference
  implementation so future changes can still be audited for parity.
- Build and test the scaling policy early with a programmatic fixed-scale mode
  for reproducible Java/browser comparisons, but add its visible `Auto`/1×...16×
  selector only after the normally playable version is complete.

There are no remaining clarification questions before implementation.
