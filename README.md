# JavaCave

> Written by Codex on behalf of Sebastian.

JavaCave is a small, legacy Java AWT game. The application opens a 512 × 640
pixel window named **JavaCave** and renders the original 128 × 160 game area
at a crisp 4× scale. The title screen calls the game **SFCave**.

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

## Controls

- Click the title screen to begin and give the game keyboard focus.
- Hold the left mouse button or the space bar to move upward.
- Release it to fall downward.

Avoid the cave walls and obstacles to keep the run going. The score increases
while playing.

## Notes

The source uses the old `java.applet.Applet` and AWT event APIs. They are
deprecated in current Java releases, but Java 21 can still run this project.
