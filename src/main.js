// Written by Codex on behalf of Sebastian.
(function bootstrapBrowserShell() {
  const canvas = document.getElementById('game');
  if (!canvas) return;
  const options = window.JavaCaveTestOptions || {};
  const engine = new window.JavaCaveEngine.Engine();
  const renderer = new window.JavaCaveRenderer.Renderer(canvas.getContext('2d'));
  let scaleMode = options.scaleMode === undefined ? 'auto' : options.scaleMode;
  const scale = () => {
    const decision = window.JavaCaveScaling.applyScale(canvas, scaleMode, window.innerWidth, window.innerHeight);
    if (decision.backingReset) renderer.render(engine);
    return decision;
  };
  scale();
  window.addEventListener('resize', scale);
  const selector = document.getElementById('scale');
  if (selector) {
    selector.value = String(scaleMode);
    selector.addEventListener('change', () => { scaleMode = selector.value === 'auto' ? 'auto' : Number(selector.value); scale(); });
  }
  const controller = new window.JavaCaveController.Controller({ engine, renderer, canvas });
  controller.bind();
  controller.start();
  const snapshot = () => ({
    state: engine.state, gameCount: engine.gameCount, score: engine.score, highScore: engine.highScore,
    y: engine.y, oldY: engine.oldY, vy: engine.vy, caveTop: engine.caveTop,
    caveHeight: engine.caveHeight, caveVelocity: engine.caveVelocity,
    pointerPressed: engine.pointerPressed, pointerClicked: engine.pointerClicked,
    keyPressed: engine.keyPressed, map: engine.map.map((row) => row.slice()),
  });
  const test = options.testApi ? {
    stopClock: () => controller.stop(),
    startClock: () => controller.start(),
    advance: (ticks = 1) => { for (let tick = 0; tick < ticks; tick += 1) controller.advance(); return snapshot(); },
    snapshot,
    useScriptedRandom(draws) {
      let index = 0;
      const previousRandom = engine.random;
      engine.random = (name) => {
        const draw = draws[index++];
        if (!draw || draw.name !== name) throw new Error(`random draw mismatch at ${index - 1}: expected ${draw?.name}, received ${name}`);
        return draw.value;
      };
      return () => {
        if (index !== draws.length) throw new Error(`unused scripted random draws: ${draws.length - index}`);
        engine.random = previousRandom;
      };
    },
    selectFrame(name) {
      controller.stop();
      if (name === 'title') { engine.setState(0); controller.advance(); }
      else {
        engine.setState(1); controller.advance();
        if (name === 'collision') { engine.y = -1; controller.advance(); }
        if (name === 'game-over') {
          engine.setState(2); engine.y = 50;
          for (let tick = 0; tick < 20; tick += 1) controller.advance();
        }
      }
      renderer.render(engine);
      return snapshot();
    },
  } : undefined;
  window.JavaCave = { engine, renderer, controller, ...(test ? { test } : {}) };
  canvas.dataset.ready = 'true';
})();
