# Original Online JavaCave Applet

> Written by Codex on behalf of Sebastian.

Latest verification: 2026-07-20

## Live files

The historical game remains available from Liquidcode:

- Page: [The Infamous Worm Game](http://www.liquidcode.org/worm.html)
- Compiled applet:
  [JavaCave.class](http://www.liquidcode.org/JavaCave.class)

The page embeds the applet at its original dimensions:

```html
<applet code="JavaCave" alt="JavaApplet" width="128" height="160">
</applet>
```

No archive or alternate codebase is specified, so the browser resolves
`JavaCave` to `JavaCave.class` beside the page. The corresponding
`http://www.liquidcode.org/JavaCave.java` URL returned HTTP 404 during the
latest verification; the website exposes compiled bytecode, not Java source.

## Downloaded-class fingerprint

The live class was downloaded to a temporary directory and inspected without
adding the binary to this repository:

| Property | Observed value |
| --- | --- |
| File size | 6,013 bytes |
| SHA-256 | `eb60b750998813029f8bd31261c2cecd5725386461b499e80e7ef0ea0d5afd0a` |
| Class-file version | 45.3, corresponding to the Java 1.1 era |
| Embedded source filename | `JavaCave.java` |
| Declared class | `JavaCave extends java.applet.Applet implements Runnable` |
| Declared members | 30 fields and 16 methods |

The class's `getAppletInfo()` metadata identifies:

- Name: JavaCave
- Author: SUNFLAT/Y. Iwasaki
- Email: `sunflat@ppp.bekkoame.or.jp`
- Historical URL: `http://www.bekkoame.or.jp/~sunflat/`
- Tool: Microsoft Visual J++ Version 1.0

The current remote file can be downloaded and checked with:

```bash
curl -L --fail \
  -o /tmp/liquidcode-JavaCave.class \
  http://www.liquidcode.org/JavaCave.class
sha256sum /tmp/liquidcode-JavaCave.class
javap -verbose /tmp/liquidcode-JavaCave.class
```

The host serves the file over plain HTTP. Treat it as untrusted remote
bytecode and verify its fingerprint before inspecting or executing it. A hash
change does not necessarily mean that a new file is malicious, but it means the
new file has not been compared with the repository source documented here.

## Comparison with this repository

The downloaded class was decompiled with CFR 0.123, the same decompiler and
version named in the header of `JavaCave.java`. The result reproduces the
repository's original applet implementation:

- constants and initial field values;
- title, game, and game-over state transitions;
- 100 ms update cadence;
- mouse and Space input flags;
- scoring and flight acceleration;
- procedural cave movement and narrowing;
- random obstacle placement;
- collision boundaries;
- title, cave, player, score, and death-animation drawing operations.

The repository source adds desktop and usability support around that applet:

- a command-line `main()` and AWT frame;
- configurable 1× through 16× display scaling;
- nearest-neighbor scaled presentation;
- keyboard-focus handling;
- redundant-cast cleanup from the decompiler output.

These additions do not alter the core game rules. This gives high confidence
that the online `JavaCave.class` is the bytecode from which the repository's
game logic was decompiled.

## Running it today

Current mainstream browsers do not natively execute Java applets. OpenJDK's
[JEP 504](https://openjdk.org/jeps/504) records that browser support is gone
and that the JDK's `appletviewer` tool was removed in JDK 11.

Two practical comparison routes remain:

1. Compile and run this repository's desktop wrapper with Java 21, following
   `README.md`. This exercises the same game logic without a browser plug-in.
2. Use a compatibility runtime such as
   [CheerpJ](https://cheerpj.com/docs/getting-started/Java-applet), which runs
   Java 8 applets through WebAssembly and JavaScript in a modern browser.
   CheerpJ can use the downloaded class without original source, but it requires
   its external runtime and an HTTP-served page.

CheerpJ is useful as a temporary reference oracle. It is not part of the
planned browser port because the finished JavaScript game must run directly,
offline, and without third-party libraries.

## Redistribution status

Neither the live HTML page nor the class file provides an obvious software
license. The embedded metadata supplies authorship but not redistribution
permission. Until the rights are established, keep the URL, fingerprint, and
comparison results as provenance and avoid committing or redistributing the
downloaded binary.
