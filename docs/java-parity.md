# JSCave Java parity specification

> Written by Codex on behalf of Sebastian.

This is the JSCave executable-port reference for `JavaCave.java`. It describes
the decompiled Java implementation as it behaves, including choices that are
easy to change accidentally in JavaScript.

## Constants and state

| Item | Java value / behavior |
| --- | --- |
| Logical surface | `128 × 160`; playfield `y = 0…127`, score strip `y = 128…159` |
| Tick | repaint/update every `100 ms`; `OnPeriod()` increments `GameCount` first |
| States | title `0`, game `1`, game over `2` |
| Cave columns | four rows × 32 columns; each column is 4 pixels wide |
| Initial game fields | `Score=0`, `my=10`, `mh=108`, `mv=0`, `oy=50`, `y=50`, `vy=-5` |
| Inputs | pointer down sets `mousePushed` and `mouseClicked`; up clears only `mousePushed`; Space sets/clears `keyPushed` |
| Thrust | `mousePushed || keyPushed`; pressed decrements velocity, otherwise increments it |
| Velocity | clamp after acceleration to inclusive `-8…8` |
| Score | add 3 on every game tick, including a collision tick |
| High score | title tick 1 promotes `Score` only if `HiScore < Score`; it is memory-only |

`(int)` in the Java source truncates toward zero.  The port must use
`Math.trunc`, not `Math.floor`, for random cave velocity and obstacle position.
Java comparisons in the collision expression are inclusive (`>=`); retain
those exact edges.

## Tick order

### Title

On title tick 1, clear the restart latch (`flag1=false`) and promote high
score. Fill `(128,128,255)`, consume one random number for blue
`Math.trunc(random * 64)`, draw the pulse oval with
`r = Math.trunc((sin(GameCount / 10) + 1) * 20) + 20`, then draw title text.
Once all thrust inputs are released, arm the latch (`flag1=true`) and clear the
previous click. A subsequent pointer-down click transitions to game and resets
`GameCount` to zero.

### Game

On game tick 1, initialize every cave column `i` with:

```text
shade = abs(i % 16 - 8) * 16
top = my; bottom = my + mh; obstacle = -1
```

Then, on every game tick, in this exact order:

1. Add score; accelerate/clamp `vy`; update `y`.
2. If the current count is divisible by 10, decrement `mh`.
3. Consume one random draw for `random < .1`; when true, consume a second draw
   and set `mv = trunc(random * 10 - 5)`.
4. Add `mv` to `my`; reflect at `my < 1` to `my=1, mv=abs(mv)` and at
   `my > 126-mh` to `my=126-mh, mv=-abs(mv)`.
5. Paint score strip, copy playfield pixels `(2,0,126,128)` by `(-4,0)`, then
   shift all four map rows left one column.
6. Draw the newest three-pixel worm segment at `x=30…34`. Earlier segments
   remain in the copied playfield and move four pixels left per tick, so after
   nine ticks the visible worm reaches the left edge. Append/paint column 31 at
   x=124, and assign its top/bottom map values.
7. On every tenth tick, consume a final draw and set obstacle top to
   `trunc(random * (mh - 16) + my)`; otherwise set the new obstacle to `-1`.
8. Set `oy=y`; test the player centre against map column 8.

The player is safe exactly when
`y >= top && bottom >= y && (obstacle == -1 || obstacle >= y || y >= obstacle + 16)`.
Anything else transitions to game over after the score/cave work above.

### Game over

Tick 1 clears the restart latch. Ticks 1–19 add an unfilled red ring centered
at `(32,y)` with radius `GameCount * 2`. Tick 20 draws `GameOver` at `(7,50)`;
if `HiScore < Score`, it draws `HiScore!!` at `(13,100)`. Tick 100 forces a
restart click (`flag1=true; mouseClicked=true`). From tick 21 on, a released
input arms/re-arms the click latch; an armed click returns to title and resets
the counter.

## Drawing reference

| Layer | Java drawing operation |
| --- | --- |
| Title background | `fillRect(0,0,128,160)` `rgb(128,128,255)` |
| Title oval | `rgb(0,trunc(random*64),128)`, `fillOval(64-r,64-r,2r,2r)` |
| Title lettering | bold TimesRoman 32: black `SFCave` `(15,50)`, white `(10,45)`; bold 16 red `Click to start!` `(10,80)`, white score `(10,110)`, high score `(10,130)` |
| Cave column | green `rgb(128-shade,255,128-shade)` full playfield, then red `rgb(shade,0,0)` opening rectangle `(x,my,4,mh)` |
| Obstacle | `rgb(0,255,128)`, `(124,obstacle,4,16)` |
| Score strip | blue rectangle `(0,128,128,32)`, bold TimesRoman 16 white `Score : n` `(20,150)` |
| Player erase | three blue lines `(30,oy-1…+1)` to `(34,y-1…+1)` |
| Death/title text | red outline ovals; bold TimesRoman 24 blue `GameOver`; orange `HiScore!!` |

Reference title captures are [1×](../reference/title-1x.png) (128 × 160) and
[4×](../reference/title-4x.png) (512 × 640).  `javac -Xlint:all` on JDK 21.0.11
passes with 17 expected Applet/Event/Thread/serial warnings.
