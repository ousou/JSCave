// Written by Codex on behalf of Sebastian.
(function exposeEngine(root, factory) {
  const api = factory(); root.JavaCaveEngine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis === 'undefined' ? this : globalThis, function createEngine() {
  const STATE = Object.freeze({ TITLE: 0, GAME: 1, OVER: 2 });
  const trunc = Math.trunc;

  class Engine {
    constructor(random = Math.random) {
      this.random = random; this.highScore = 0; this.score = 0;
      this.pointerPressed = false; this.pointerClicked = false; this.keyPressed = false;
      this.map = Array.from({ length: 4 }, () => Array(32).fill(-1));
      this.setState(STATE.TITLE);
    }
    draw(name) { return this.random(name); }
    setState(state) { this.state = state; this.gameCount = 0; }
    get thrusting() { return this.pointerPressed || this.keyPressed; }
    pointerDown() { this.pointerPressed = true; this.pointerClicked = true; }
    pointerUp() { this.pointerPressed = false; }
    spaceDown() { this.keyPressed = true; }
    spaceUp() { this.keyPressed = false; }
    releaseInput() { this.pointerUp(); this.spaceUp(); }
    tick() {
      this.gameCount += 1;
      if (this.state === STATE.TITLE) return this.titleTick();
      if (this.state === STATE.GAME) return this.gameTick();
      return this.overTick();
    }
    titleTick() {
      if (this.gameCount === 1) { this.latch = false; if (this.highScore < this.score) this.highScore = this.score; }
      this.titleBlue = trunc(this.draw('title-blue') * 64);
      this.titleRadius = trunc((Math.sin(this.gameCount / 10) + 1) * 20) + 20;
      if (!this.latch && !this.pointerPressed) { this.latch = true; this.pointerClicked = false; }
      if (this.latch && this.pointerClicked) this.setState(STATE.GAME);
    }
    gameTick() {
      if (this.gameCount === 1) {
        this.score = 0; this.caveTop = 10; this.caveHeight = 108; this.caveVelocity = 0;
        this.oldY = 50; this.y = 50; this.vy = -5;
        for (let column = 0; column < 32; column += 1) {
          this.map[0][column] = this.caveTop; this.map[1][column] = this.caveTop + this.caveHeight; this.map[2][column] = -1;
        }
      }
      this.score += 3;
      this.vy += this.thrusting ? -1 : 1; this.vy = Math.max(-8, Math.min(8, this.vy)); this.y += this.vy;
      if (this.gameCount % 10 === 0) this.caveHeight -= 1;
      if (this.draw('cave-change-roll') < .1) this.caveVelocity = trunc(this.draw('cave-velocity') * 10 - 5);
      this.caveTop += this.caveVelocity;
      if (this.caveTop < 1) { this.caveTop = 1; this.caveVelocity = Math.abs(this.caveVelocity); }
      if (this.caveTop > 126 - this.caveHeight) { this.caveTop = 126 - this.caveHeight; this.caveVelocity = -Math.abs(this.caveVelocity); }
      for (let row = 0; row < 4; row += 1) this.map[row].shift();
      this.map[0][31] = this.caveTop; this.map[1][31] = this.caveTop + this.caveHeight;
      this.map[2][31] = this.gameCount % 10 === 0 ? trunc(this.draw('obstacle-y') * (this.caveHeight - 16) + this.caveTop) : -1;
      this.trailStartY = this.oldY;
      this.oldY = this.y;
      if (!this.isSafeAtCollisionColumn()) this.setState(STATE.OVER);
    }
    isSafeAtCollisionColumn() {
      const [top, bottom, obstacle] = [this.map[0][8], this.map[1][8], this.map[2][8]];
      return this.y >= top && bottom >= this.y && (obstacle === -1 || obstacle >= this.y || this.y >= obstacle + 16);
    }
    overTick() {
      if (this.gameCount === 1) this.latch = false;
      if (this.gameCount === 100) { this.latch = true; this.pointerClicked = true; }
      if (this.gameCount > 20 && !this.latch && !this.pointerPressed) { this.latch = true; this.pointerClicked = false; }
      if (this.gameCount > 20 && this.latch && this.pointerClicked) this.setState(STATE.TITLE);
    }
  }
  return { Engine, STATE, trunc };
});
