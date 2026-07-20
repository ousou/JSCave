# Browser Port Completion Plan

Latest update: 2026-07-20
Written by: Codex on behalf of Sebastian

## Goal

Finish the browser-port work that remains after the initial JavaScript release:
lock deterministic engine behavior, exercise real browser controls and complete
state cycles, verify canvas pixels and screenshots, test scaling through the
visible UI, validate the standalone artifact and offline behavior, cover Chrome
and Firefox, and make the documented release checks reproducible.

This plan complements `plan/browser_javascript_port.md`. During final
verification, reconcile that original checklist with evidence from the new
tests instead of treating previously checked items as proof by themselves.

## Confirmed decisions

- Enter starts the game from the title and returns from game over after the
  original restart delay. A second Enter starts the next game after returning
  to the title, preserving the Java state sequence.
- Space remains exclusively the thrust control and does not activate title or
  game-over transitions.
- Keyboard controls apply when the game canvas has focus. The canvas remains
  reachable with Tab, and pointer activation continues to focus it.
- Enter never changes thrust state. Key-repeat must not trigger additional
  activation transitions.
- Pointer/touch behavior, the 100 ms simulation cadence, scoring, collision
  rules, and the original automatic game-over timeout remain unchanged.
- Chrome is the required browser test engine. Firefox is the second engine and
  should run when installed, with an explicit skip when unavailable.
- Keep the shipped game and development tests dependency-free. Browser
  automation may use Node 22 standard APIs and browser debugging protocols, but
  must not add a package manager, third-party library, CDN, or network service.

## Assumptions and non-goals

- Keyboard activation is an accessibility extension to the Java behavior; it
  does not change simulation parity after gameplay begins.
- Tests may inject deterministic random values, stop the production timer, and
  inspect game state through the existing `window.JavaCave` test surface.
  Production defaults must remain random and timer-driven.
- Stable geometry and non-text pixels are checked exactly. Font rasterization
  may differ across operating systems, so automated image checks mask
  font-sensitive regions.
- Persistent scores, audio, accounts, new gameplay, mobile-specific gestures,
  and visual redesign remain out of scope.
- Generated browser captures are reviewed against the Java reference images
  before being accepted. No font bundle is introduced to force text parity.

## Implementation checklist

### 1. Complete deterministic engine characterization

- [ ] Add failing table-driven tests that load
  `tests/fixtures/java-characterization.json` and cover every declared case,
  including cave reflection, exact tenth-tick random consumption, death rings
  1–19, game-over text at tick 20, high-score promotion, click restart, and the
  automatic return path.
- [ ] Replace the loose random counter with a scripted-random helper that names
  each expected draw and fails on a missing, extra, or out-of-order draw.
- [ ] Add a failing fixed-seed replay test that records canonical state after
  several hundred ticks across title, gameplay, collision, game over, and
  return-to-title behavior, then asserts a checked-in SHA-256 trace checksum.
- [ ] Make only the engine corrections exposed by those tests, preserving Java
  truncation, inclusive collision edges, and mutation order.
- [ ] Run the complete engine and existing unit suites twice with identical
  seeds and verify identical replay checksums.
- [ ] Commit the verified deterministic engine characterization and any required
  engine corrections.

### 2. Add dependency-free real-browser automation

- [ ] Add failing tests for a Node standard-library Chrome DevTools Protocol
  helper that launches an isolated headless browser, navigates `file:` and HTTP
  pages, evaluates JavaScript, dispatches genuine pointer/keyboard input,
  resizes the viewport, records network requests and console errors, reads
  canvas pixels, and captures clipped screenshots.
- [ ] Implement the helper with temporary browser profiles, bounded timeouts,
  deterministic cleanup, Node 22 WebSocket support, and actionable diagnostics
  when Chrome fails or a page becomes unresponsive.
- [ ] Add a small in-page deterministic test API that can stop/start the clock,
  supply scripted randomness, advance exact ticks, expose a serializable state
  snapshot, and select named title/game/collision/game-over frames without
  changing production defaults.
- [ ] Verify the helper detects the former title-to-game freeze, JavaScript
  exceptions, unexpected console errors, external network requests, and browser
  processes that fail to exit.
- [ ] Commit the verified browser automation and deterministic browser test API.

### 3. Implement accessible Enter activation and test all controls

- [ ] Add failing engine/controller unit tests for activation separate from
  thrust: Enter activation on title, ignored activation during gameplay,
  game-over delay enforcement, return to title after the delay, no Enter
  key-repeat action, and unchanged Space/pointer state.
- [ ] Add failing real-browser tests that Tab-focus the canvas and dispatch
  pointer down/up/cancel plus Space down/up and Enter down/up; assert default
  prevention, canvas focus, pointer capture when supported, and exact engine
  input state after every event.
- [ ] Add failing browser tests proving blur and hidden-page transitions release
  thrust, focus on the scale selector does not control the game or suppress its
  normal Space behavior, and rapid alternating inputs cannot leave thrust stuck.
- [ ] Implement Enter activation in the engine/controller while scoping game
  keyboard handling to the focused canvas and preserving pointer-to-focus
  behavior.
- [ ] Update visible control help and accessibility labeling to explain
  “Enter to start/restart; hold Space or pointer to fly.”
- [ ] Run engine, controller, DOM-input, accessibility, and browser smoke tests
  in Chrome.
- [ ] Commit the verified keyboard activation and input handling change.

### 4. Add complete deterministic browser state-cycle tests

- [ ] Add a failing pointer-only replay through real DOM input: title start,
  controlled flight for several ticks, deliberate collision, score assertion,
  death animation, click return to title, and a second game start.
- [ ] Add a failing keyboard-only replay: Tab focus, Enter start, Space flight,
  deliberate collision, delayed Enter return to title, and Enter start again;
  assert Enter never contributes thrust.
- [ ] Add a failing automatic-timeout replay that uses no restart input and
  verifies the exact tick at which game over returns to the title.
- [ ] Add rapid-input, pointer-cancel, resize-during-play, blur/background, and
  narrow-viewport scenarios that assert simulation state and logical canvas
  pixels do not change except when an intentional tick advances.
- [ ] Fix integration behavior exposed by the replays without changing the
  deterministic engine rules.
- [ ] Run all state-cycle replays repeatedly with fixed seeds.
- [ ] Commit the verified playable browser integration.

### 5. Verify scale-selector behavior without clearing gameplay

- [ ] Add failing DOM tests that assert the accessible selector contains Auto
  and every integer scale from 1× through 16× in order.
- [ ] Add failing browser tests for forced 1× and 4× dimensions, fixed scale
  across viewport resize, returning to Auto, the largest fitting Auto scale,
  oversized forced output scrolling rather than shrinking, and the permanent
  128 × 160 backing store.
- [ ] Add a failing test that changes scale and resizes during gameplay while
  asserting the same engine object/state and byte-identical logical canvas
  pixels before the next simulation tick.
- [ ] Change scaling so assigning an unchanged backing width/height cannot clear
  the canvas; render immediately only when a genuine backing reset is required.
- [ ] Run pure scaling, selector DOM, resize, pixel-preservation, and full-cycle
  tests at forced 1× and 4×.
- [ ] Commit the verified scaling UI and canvas-preservation change.

### 6. Strengthen renderer commands, pixels, and visual references

- [ ] Expand the recording canvas context so tests capture property assignments
  and ordered operations, then add failing assertions for exact colors, fonts,
  coordinates, line width, layer order, all three player lines, obstacle
  placement, death rings, `GameOver`, and conditional `HiScore!!`.
- [ ] Add deterministic real-browser `getImageData` tests for stable non-text
  landmarks and palette colors on title, initial game, mid-game, collision, and
  game-over frames.
- [ ] Add a masked logical-pixel checksum for every named frame, excluding
  documented font-sensitive rectangles while retaining geometry and palette
  coverage.
- [ ] Add screenshot capture at forced 1× and 4× for every named frame; assert
  dimensions and nearest-neighbor block expansion, and store reviewed reference
  images under `reference/`.
- [ ] Inspect the generated captures against `reference/title-1x.png`,
  `reference/title-4x.png`, and the Java drawing specification; document any
  accepted font-only differences.
- [ ] Fix renderer discrepancies exposed by command, pixel, or screenshot tests.
- [ ] Run renderer unit tests and browser pixel/screenshot tests twice at 1× and
  4× and verify stable non-text checksums.
- [ ] Commit the verified renderer tests and reviewed browser reference images.

### 7. Verify standalone, offline, and deterministic packaging

- [ ] Add failing packaging tests that build the expected standalone HTML in
  memory, compare it byte-for-byte with `javacave.html`, reject remaining local
  asset references, and prove repeated generation is identical.
- [ ] Refactor `scripts/package.js` to expose deterministic build/check
  operations and a non-mutating `--check` mode while retaining the normal
  regeneration command.
- [ ] Add real-browser tests that load `javacave.html` directly from `file:`,
  start gameplay with pointer and Enter paths, and complete a deterministic
  state transition with external networking unavailable.
- [ ] Record Chrome network events and assert that direct standalone play makes
  no resource request beyond the one local HTML document; also load the
  artifact from the local HTTP server and reject external origins.
- [ ] Run the same applicable title/start/scale/pixel smoke assertions against
  both `index.html` and `javacave.html`.
- [ ] Regenerate `javacave.html`, run `--check`, and run all standalone tests.
- [ ] Commit the verified deterministic standalone delivery.

### 8. Add Chrome/Firefox compatibility and repeatability gates

- [ ] Add a browser capability probe that requires Chrome, runs Firefox when
  available, and reports an explicit test skip—with the searched executable
  names—when Firefox is absent.
- [ ] Add an HTTP compatibility harness that reports script load, canvas
  rendering, title-to-game startup, Enter/Space input, fixed scaling, and
  console/runtime failures back to the Node test server in both browsers.
- [ ] Run direct-file, CDP integration, pixel, and screenshot tests in Chrome;
  run the portable smoke/state/input assertions in Firefox without pretending
  unsupported automation features were exercised.
- [ ] Add a bounded repeatability command that runs seeded engine, browser
  state-cycle, standalone, and compatibility tests at least ten times and fails
  on checksum drift, timeout, browser crash, or leaked process.
- [ ] Run the repeatability gate in the current environment and record Chrome
  and Firefox versions in the verification output.
- [ ] Commit the verified cross-browser and repeatability checks.

### 9. Finish documentation and release verification

- [ ] Update `README.md` with supported browser expectations, Enter/Space
  controls, browser versus Java requirements, project structure, and exact
  development/release commands.
- [ ] Update `AUTOMATION.md` with deterministic browser screenshot generation,
  masked checksum rules, golden-image review, Firefox skip behavior,
  standalone/offline checks, repeatability, and clean-release verification.
- [ ] Reconcile `plan/browser_javascript_port.md`: check only items now backed
  by tests or captured evidence, correct checked items that were previously
  overstated, and link to this completion plan.
- [ ] Add a standard-library release-verification command that runs unit and
  browser suites, packaging `--check`, no-external-resource checks, and
  `javac -Xlint:all -d <temporary-directory> JavaCave.java` without polluting
  the repository.
- [ ] Run release verification from a clean exported `HEAD`, including direct
  file, local HTTP, Chrome, Firefox-or-explicit-skip, Java compilation, artifact
  integrity, and a clean-worktree assertion.
- [ ] Confirm there are no generated dependency directories, unexpected
  binaries, external runtime resources, console errors, or uncommitted files.
- [ ] Commit the verified documentation, reconciled plans, and release command.

## Final acceptance

- [ ] Enter provides a complete keyboard-only title/game/game-over/title cycle
  while Space remains thrust-only and pointer/touch behavior is unchanged.
- [ ] Fixed-seed engine traces, full browser state cycles, ordered renderer
  commands, masked pixel checksums, and reviewed 1×/4× screenshots are stable.
- [ ] Auto and 1×…16× selector behavior preserve engine state and logical canvas
  pixels across scale and viewport changes.
- [ ] Both source and standalone pages start and play from `file:` and local
  HTTP in Chrome without external networking; portable checks pass in Firefox.
- [ ] The standalone artifact is byte-reproducible and contains all required
  runtime resources.
- [ ] The full documented verification passes from a clean exported commit and
  leaves the repository clean.

## Open questions

None. Sebastian selected Enter for start/restart and Space for flight. Firefox
is the additional browser because it is installed locally and was the browser
in which the startup freeze was reported.
