// Written by Codex on behalf of Sebastian.
(function bootstrapBrowserShell() {
  const canvas = document.getElementById('game');
  if (!canvas) return;
  const options = window.JavaCaveTestOptions || {};
  const scaleMode = options.scaleMode === undefined ? 'auto' : options.scaleMode;
  const scale = () => window.JavaCaveScaling.applyScale(canvas, scaleMode, window.innerWidth, window.innerHeight);
  scale();
  window.addEventListener('resize', scale);
  canvas.dataset.ready = 'true';
})();
