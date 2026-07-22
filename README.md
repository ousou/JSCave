# JSCave

JSCave is a dependency-free browser port of the [Infamous Worm Game](http://www.liquidcode.org/worm.html), a.k.a JavaCave.

You can play it at [ousou.github.io/JSCave](https://ousou.github.io/JSCave/).

## Play locally in a browser

Open `jscave.html`, or open `index.html` while developing. An optional local
server also works:

```bash
python3 -m http.server
```

The canvas must have focus for keyboard controls. Click it or reach it with
Tab, then:

- press Enter to start;
- hold Space, pointer, or touch to fly upward;
- release to fall;
- after game over, press Enter after the restart delay to return to the title,
  then press Enter again to start the next game.

Space is thrust-only. Enter never changes thrust. Pointer activation focuses
the canvas, and blur, backgrounding, or pointer cancellation releases held
input.

The logical surface is permanently 128 × 160 pixels. Display scale `Auto`
chooses the largest fitting integer scale; the selector can force 1× through
16×. Forced oversized output scrolls instead of changing the logical canvas.

Current Chrome is the required release-test browser. Portable compatibility
checks also run in current Firefox when it is installed and report an explicit
skip otherwise. The shipped game uses standard browser Canvas, Pointer Event,
and keyboard APIs and has no external runtime resource.

## Development and release

Development checks require Node.js 22 and a local Chrome installation. Firefox
is optional but recommended. A JDK is required only for Java-reference
compilation during release verification.

```bash
# Unit tests
node --test tests/engine-characterization.test.js tests/engine.test.js \
  tests/controller.test.js tests/renderer.test.js tests/scaling.test.js

# Representative real-browser suites
node tests/browser-state-cycle.test.js
node tests/browser-renderer.test.js
node tests/browser-standalone.test.js
node tests/browser-compatibility.test.js

# Regenerate or non-mutatingly check the standalone artifact
node scripts/package.js
node scripts/package.js --check

# Ten-run seeded/browser/cross-browser stability gate
node scripts/repeatability.js

# Full release gate from a clean exported HEAD
node scripts/release-verify.js
```

`scripts/release-verify.js` requires a clean worktree. It exports tracked
`HEAD` files to a temporary directory, runs unit and browser suites, validates
standalone integrity and local-only networking, compiles Java into a temporary
directory with `-Xlint:all`, rejects generated dependencies or unexpected
binaries, and proves neither the export nor worktree changed.

## Project structure

- `index.html`, `styles.css`, `src/` — maintainable browser source.
- `jscave.html` — generated, byte-reproducible standalone release.
- `tests/` — Node, CDP Chrome, and portable Chrome/Firefox checks.
- `reference/` — Java title references, reviewed browser frames, and the legacy Java source.
- `scripts/` — packaging, repeatability, and release verification.
- `reference/java/JavaCave.java` — legacy Java behavioral reference.
- `reference/java/ORIGINAL_APPLET.md` — original applet provenance and execution notes.
- `docs/java-parity.md` — transcribed Java behavior and drawing rules.
- `docs/AUTOMATION.md` — screenshot and release-review procedure.

## Java reference

The browser edition is primary. To compile and run the historical Java version,
use a JDK with desktop AWT support:

```bash
javac -Xlint:all -d /tmp/JavaCave-classes reference/java/JavaCave.java
java -cp /tmp/JavaCave-classes JavaCave
```

The legacy Applet/AWT APIs produce expected deprecation/removal warnings. See
[`reference/java/ORIGINAL_APPLET.md`](reference/java/ORIGINAL_APPLET.md) for
provenance and modern execution notes.
