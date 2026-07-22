# JSCave automation and release guide

Written by: Codex on behalf of Sebastian

## Clean release verification

Install Node.js 22, current Chrome, an optional current Firefox, and a JDK.
From a clean worktree, run:

```bash
node scripts/release-verify.js
```

The command copies tracked `HEAD` files into a temporary clean export. It then
runs the engine, renderer, controller, scaling, DOM, CDP, standalone, network,
pixel, screenshot, Chrome, and Firefox-or-explicit-skip checks; runs
`node scripts/package.js --check`; and compiles:

```bash
javac -Xlint:all -d <temporary-directory> reference/java/JavaCave.java
```

No `.class` file or other build output is written into the repository. The
command rejects dependency directories, unexpected binaries, external runtime
requests, stale standalone bytes, modified export files, and a dirty worktree.

For the longer stability gate, run:

```bash
node scripts/repeatability.js
```

It performs at least ten bounded iterations of the seeded engine trace, full
Chrome state cycles, standalone/offline checks, and portable Chrome/Firefox
compatibility. It reports the exact browser versions. Chrome is required;
Firefox reports `SKIP` plus every searched executable name when unavailable.

## Deterministic browser captures

The five named frames are `title`, `initial-game`, `mid-game`, `collision`, and
`game-over`. Generate candidate 1× and 4× Chrome captures with:

```bash
UPDATE_REFERENCES=1 node tests/browser-renderer.test.js
```

This writes `reference/browser-<frame>-1x.png` and
`reference/browser-<frame>-4x.png` and prints the logical masked checksums.
Review every changed image before accepting it, then record intentional checksum
changes in `tests/browser-renderer.test.js` and rerun without update mode:

```bash
node tests/browser-renderer.test.js
```

The normal test is non-mutating. It checks exact dimensions, stable logical
pixels, checked-in reference pixels, and nearest-neighbor 4× block expansion.
Font-sensitive rectangles are zeroed only for the logical SHA-256 calculation:
title labels and score text, the gameplay score strip, and `GameOver`/
`HiScore!!` rectangles. Cave geometry, death rings, player pixels, palette, and
all pixels outside those documented rectangles remain covered.

Compare browser title captures with `reference/title-1x.png` and
`reference/title-4x.png`, the Java references. Cross-platform serif glyph
rasterization is an accepted font-only difference; geometry, coordinates,
palette, and scaling are not. `reference/README.md` records the accepted review.

## Standalone and offline checks

Regenerate and validate the single-file artifact with:

```bash
node scripts/package.js
node scripts/package.js --check
node tests/packaging.test.js
node tests/browser-standalone.test.js
```

Packaging is deterministic and `--check` does not write. Browser checks open
`jscave.html` directly through `file:`, exercise pointer and Enter starts,
complete a deterministic transition, and assert the only direct-file requests
are the local HTML documents. Source and standalone pages are also compared
over local HTTP, with external origins rejected.

## Focused diagnostics

```bash
node tests/browser-input.test.js
node tests/browser-state-cycle.test.js
node tests/browser-scaling.test.js
node tests/browser-renderer.test.js
node tests/browser-compatibility.test.js
```

The CDP helper uses isolated Chrome profiles, bounded commands, genuine CDP
pointer/keyboard input, console and runtime exception collection, request
recording, screenshots, pixels, and deterministic process cleanup. The portable
HTTP harness reports script load, canvas output, Enter/Space behavior, fixed
scaling, and runtime failures from both Chrome and Firefox.

## Optional legacy Java title capture

The existing `reference/title-1x.png` and `reference/title-4x.png` files are the
reviewed Java drawing references. If they must be recreated, install a JDK,
Xvfb, ImageMagick, and `x11-utils`, compile into a temporary directory, launch
the Java reference in Xvfb at 1× and 4×, and capture exactly 128 × 160 or
512 × 640 pixels. Expected Applet/AWT deprecation warnings are not failures;
compiler errors, incorrect dimensions, or repository-local `.class` files are.
