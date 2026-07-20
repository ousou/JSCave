# JavaCave automation and screenshot guide

> Written by Codex on behalf of Sebastian.

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

The following command starts the game in a virtual 800 × 600 display, waits
for the title screen, saves its 512 × 640 game window, then stops the game:

```bash
screenshot_path=/tmp/javacave-title-screen.png
xvfb-run -a -s '-screen 0 800x600x24' bash -c '
  java -cp . JavaCave &
  game_pid=$!
  trap "kill $game_pid 2>/dev/null" EXIT
  sleep 2
  import -display "$DISPLAY" -window root -crop 512x640+0+0 "$1"
' _ "$screenshot_path"
identify "$screenshot_path"
```

Expected output from `identify` includes `PNG 512x640`. The capture is the
title screen, which is sufficient to verify that the game launches and paints.

## Diagnose a wrong-size capture

If the image is not 512 × 640, leave the game running inside Xvfb and inspect
the virtual display:

```bash
DISPLAY=:99 xwininfo -root -tree
```

The main `JavaCave` window and its `sun-awt-X11-XPanelPeer` child should each
be `512x640`. If they are smaller, rebuild from the current source; the
`DisplayScale` and `getPreferredSize()` implementations are what make the
window open at 4× the original game resolution.

## Manual game verification

For an interactive check on a normal desktop, run:

```bash
java -cp . JavaCave
```

Click the title screen to start. Hold the mouse button or space bar to rise;
release it to fall.
