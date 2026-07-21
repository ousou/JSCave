const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { Engine, STATE } = require('../src/engine.js');
const { scriptedRandom, seededRandom } = require('./helpers/scripted-random.js');

const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/java-characterization.json'), 'utf8'));

function initializedGame(random = () => .5) {
  const game = new Engine(random);
  game.setState(STATE.GAME);
  game.tick();
  return game;
}

const cases = {
  'title-to-game'() {
    const game = new Engine(() => .5);
    game.tick();
    game.pointerDown();
    game.tick();
    assert.equal(game.state, STATE.GAME);
    assert.equal(game.gameCount, 0);
  },
  'acceleration-clamps'() {
    const game = initializedGame();
    game.vy = -8; game.spaceDown(); game.tick(); assert.equal(game.vy, -8);
    game.vy = 8; game.spaceUp(); game.tick(); assert.equal(game.vy, 8);
  },
  'cave-reflection'() {
    for (const boundary of ['top', 'bottom']) {
      const game = initializedGame();
      game.caveVelocity = boundary === 'top' ? -5 : 5;
      game.caveTop = boundary === 'top' ? 1 : 126 - game.caveHeight;
      game.tick();
      assert.ok(game.caveTop >= 1 && game.caveTop <= 126 - game.caveHeight);
      assert.equal(Math.sign(game.caveVelocity), boundary === 'top' ? 1 : -1);
    }
  },
  'tenth-tick'() {
    const draws = [];
    for (let tick = 1; tick <= 10; tick += 1) {
      draws.push({ name: 'cave-change-roll', value: .5 });
      if (tick === 10) draws.push({ name: 'obstacle-y', value: .5 });
    }
    const random = scriptedRandom(draws);
    const game = new Engine(random); game.setState(STATE.GAME);
    for (let tick = 0; tick < 10; tick += 1) game.tick();
    assert.equal(game.caveHeight, 107);
    assert.equal(game.map[2][31], 55);
    random.assertComplete();
  },
  'safe-obstacle-edge'() {
    const game = initializedGame();
    Object.assign(game.map[0], { 8: 10 }); Object.assign(game.map[1], { 8: 90 }); Object.assign(game.map[2], { 8: 40 });
    for (const y of [40, 56]) { game.y = y; assert.equal(game.isSafeAtCollisionColumn(), true); }
  },
  'colliding-obstacle-interior'() {
    const game = initializedGame();
    game.map[0][8] = 10; game.map[1][8] = 90; game.map[2][8] = 40; game.y = 41;
    assert.equal(game.isSafeAtCollisionColumn(), false);
  },
  'opening-edges'() {
    const game = initializedGame();
    game.map[0][8] = 10; game.map[1][8] = 90; game.map[2][8] = -1;
    for (const y of [10, 90]) { game.y = y; assert.equal(game.isSafeAtCollisionColumn(), true); }
  },
  'outside-opening'() {
    const game = initializedGame();
    game.map[0][8] = 10; game.map[1][8] = 90; game.map[2][8] = -1;
    for (const y of [9, 91]) { game.y = y; assert.equal(game.isSafeAtCollisionColumn(), false); }
  },
  score() {
    const game = initializedGame();
    assert.equal(game.score, 3);
  },
  'death-animation'() {
    const game = new Engine(() => .5); game.setState(STATE.OVER);
    const rings = [];
    for (let tick = 1; tick <= 20; tick += 1) {
      game.tick();
      if (game.gameCount < 20) rings.push(game.gameCount);
    }
    assert.deepEqual(rings, Array.from({ length: 19 }, (_, index) => index + 1));
    assert.equal(game.gameCount, 20);
  },
  'high-score'() {
    const game = new Engine(() => .5); game.score = 99; game.highScore = 42;
    game.tick();
    assert.equal(game.highScore, 99);
  },
  'click-restart'() {
    const game = new Engine(() => .5); game.setState(STATE.OVER);
    for (let tick = 0; tick < 21; tick += 1) game.tick();
    game.pointerDown(); game.tick();
    assert.equal(game.state, STATE.TITLE);
  },
  'automatic-return'() {
    const game = new Engine(() => .5); game.setState(STATE.OVER);
    for (let tick = 0; tick < 100; tick += 1) game.tick();
    assert.equal(game.state, STATE.TITLE);
    assert.equal(game.gameCount, 0);
  },
};

for (const fixtureCase of fixture.cases) {
  test(`Java characterization: ${fixtureCase.name}`, () => {
    assert.equal(typeof cases[fixtureCase.name], 'function', `missing test implementation for fixture case "${fixtureCase.name}"`);
    cases[fixtureCase.name]();
  });
}

test('fixed-seed replay has the canonical multi-state trace', () => {
  const game = new Engine(seededRandom(0x5fcafe));
  const trace = [];
  for (let step = 0; step < 360; step += 1) {
    if (step === 1 || step === 230) game.pointerDown();
    if (step === 2 || step === 231) game.pointerUp();
    if (step === 70 || step === 290) game.y = -100;
    game.tick();
    trace.push({
      state: game.state, gameCount: game.gameCount, score: game.score, highScore: game.highScore,
      y: game.y, oldY: game.oldY, vy: game.vy, caveTop: game.caveTop,
      caveHeight: game.caveHeight, caveVelocity: game.caveVelocity,
      pointerPressed: game.pointerPressed, pointerClicked: game.pointerClicked,
      map: game.map,
    });
  }
  const checksum = crypto.createHash('sha256').update(JSON.stringify(trace)).digest('hex');
  assert.equal(checksum, '5ec14adbe0d812b78f64635dfd0597262929620eb5f36da686fa6cac5255e4e4');
});
