# JavaCave

> Written by Codex on behalf of Sebastian.

JavaCave is a small, legacy Java AWT game. By default, the application opens
the original 128 × 160 pixel window named **JavaCave**. The title screen calls
the game **SFCave**.

## Requirements

- A Java Development Kit (JDK), version 21 or later. The JDK supplies both
  `java` (to run the game) and `javac` (to compile it).
- A graphical desktop session (X11, Wayland, Windows, or macOS) so AWT can
  create a window.

On Ubuntu or Debian, install the JDK with:

```bash
sudo apt install openjdk-21-jdk
```

Check the installation:

```bash
java -version
javac -version
```

## Compile

From the repository root:

```bash
javac JavaCave.java
```

This produces `JavaCave.class` and `JavaCave$1.class` beside the source file.

## Run

Run the compiled game from the repository root:

```bash
java -cp . JavaCave
```

Close the window normally to stop the game.

### Choose a display scale

Use `--scale` to enlarge the original game area with crisp integer scaling.
The default is `1`; values from `1` to `16` are accepted.

```bash
# Original 128 × 160 window (the default)
java -cp . JavaCave

# Recommended modern-monitor size: 512 × 640
java -cp . JavaCave --scale 4
```

The equivalent `--scale=4` form also works.

## Controls

- Click the title screen to begin and give the game keyboard focus.
- Hold the left mouse button or the space bar to move upward.
- Release it to fall downward.

Avoid the cave walls and obstacles to keep the run going. The score increases
while playing.

## Notes

The source uses the old `java.applet.Applet` and AWT event APIs. They are
deprecated in current Java releases, but Java 21 can still run this project.
