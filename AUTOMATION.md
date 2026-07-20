# JavaCave automation and screenshot guide

> Written by Codex on behalf of Sebastian.

## Browser port checks

The browser edition is dependency-free at runtime. From the repository root,
run its deterministic Node and headless-Chrome checks, then regenerate the
single-file release:

```bash
node --test tests/*.test.js
node scripts/package.js
```

Open `javacave.html` directly to verify standalone delivery. Review captures
at forced 1× or 4× for logical geometry and palette; serif text may differ by
operating system. The Java source and its captures remain the parity reference.

Use this procedure to compile JavaCave, launch it without a visible desktop,
and capture its title screen. Run every command from the repository root.

## Dependencies

On Ubuntu or Debian, install the required tools once:

```bash
sudo apt install openjdk-21-jdk xvfb imagemagick x11-utils
```

This supplies:

- `javac` and `java` from the JDK;
- `xvfb-run` for a disposable virtual X11 display;
- ImageMagick's `import` command to capture the display;
- `xwininfo` to verify window geometry when diagnosing a capture.

## Compile before capturing

```bash
javac -Xlint:all JavaCave.java
```

The project intentionally uses legacy Applet/AWT APIs, so deprecation warnings
are expected. Treat compiler errors as failures.

## Capture the title screen

The following command starts the game at 4× scale in a virtual display, waits
for the title screen, saves its 512 × 640 game window, then stops the game:

```bash
scale=4
screenshot_width=$((128 * scale))
screenshot_height=$((160 * scale))
screenshot_path=/tmp/javacave-title-screen.png
xvfb-run -a -s '-screen 0 1024x768x24' bash -c '
  java -cp . JavaCave --scale "$1" &
  game_pid=$!
  trap "kill $game_pid 2>/dev/null" EXIT
  sleep 2
  import -display "$DISPLAY" -window root -crop "${2}x${3}+0+0" "$4"
' _ "$scale" "$screenshot_width" "$screenshot_height" "$screenshot_path"
identify "$screenshot_path"
```

Expected output from `identify` includes `PNG 512x640` when `scale=4`. Change
`scale` to any integer from `1` to `16`; the resulting image dimensions are
`128 × scale` by `160 × scale`. The capture is the title screen, which is
sufficient to verify that the game launches and paints.

## Diagnose a wrong-size capture

If the image dimensions do not match the selected scale, leave the game
running inside Xvfb and inspect the virtual display:

```bash
DISPLAY=:99 xwininfo -root -tree
```

The main `JavaCave` window and its `sun-awt-X11-XPanelPeer` child should each
be `128 × scale` by `160 × scale` (for example, `512x640` at scale 4). If they
are smaller, rebuild from the current source; the `--scale` option and
`getPreferredSize()` implementation control the window size.

## Manual game verification

For an interactive check on a normal desktop, run:

```bash
# Original 1× scale
java -cp . JavaCave

# 4× scale
java -cp . JavaCave --scale 4
```

Click the title screen to start. Hold the mouse button or space bar to rise;
release it to fall.
