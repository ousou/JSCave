// Written by Codex on behalf of Sebastian.
(function exposeScaling(root, factory) {
  const api = factory();
  root.JavaCaveScaling = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis === 'undefined' ? this : globalThis, function createScaling() {
  const LOGICAL_WIDTH = 128;
  const LOGICAL_HEIGHT = 160;
  const MAX_SCALE = 16;

  function chooseScale(mode, viewportWidth, viewportHeight) {
    let scale;
    if (mode === 'auto') {
      scale = Math.max(1, Math.min(
        MAX_SCALE,
        Math.floor(viewportWidth / LOGICAL_WIDTH),
        Math.floor(viewportHeight / LOGICAL_HEIGHT),
      ));
    } else if (Number.isInteger(mode) && mode >= 1 && mode <= MAX_SCALE) {
      scale = mode;
    } else {
      throw new RangeError('Scale mode must be auto or an integer from 1 through 16.');
    }
    return { scale, backing: { width: LOGICAL_WIDTH, height: LOGICAL_HEIGHT } };
  }

  function applyScale(canvas, mode, viewportWidth, viewportHeight) {
    const decision = chooseScale(mode, viewportWidth, viewportHeight);
    decision.backingReset = canvas.width !== decision.backing.width || canvas.height !== decision.backing.height;
    if (canvas.width !== decision.backing.width) canvas.width = decision.backing.width;
    if (canvas.height !== decision.backing.height) canvas.height = decision.backing.height;
    canvas.style.width = `${decision.backing.width * decision.scale}px`;
    canvas.style.height = `${decision.backing.height * decision.scale}px`;
    canvas.dataset.scale = String(decision.scale);
    return decision;
  }

  return { LOGICAL_WIDTH, LOGICAL_HEIGHT, MAX_SCALE, chooseScale, applyScale };
});
