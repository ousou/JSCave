// Written by Codex on behalf of Sebastian.
(function bootstrapBrowserShell() {
  const canvas = document.getElementById('game');
  if (!canvas) return;
  const options = window.JavaCaveTestOptions || {};
  const scaleMode = options.scaleMode === undefined ? 'auto' : options.scaleMode;
  const scale = () => window.JavaCaveScaling.applyScale(canvas, scaleMode, window.innerWidth, window.innerHeight);
  scale();
  window.addEventListener('resize', scale);
  const engine = new window.JavaCaveEngine.Engine();
  const renderer = new window.JavaCaveRenderer.Renderer(canvas.getContext('2d'));
  const controller = new window.JavaCaveController.Controller({ engine, renderer, canvas });
  controller.bind();
  controller.start();
  window.JavaCave = { engine, renderer, controller };
  canvas.dataset.ready = 'true';
})();
