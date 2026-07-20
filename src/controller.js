// Written by Codex on behalf of Sebastian.
(function exposeController(root, factory) { const api = factory(); root.JavaCaveController = api; if (typeof module !== 'undefined' && module.exports) module.exports = api; })(globalThis, function () {
  class Controller {
    constructor({ engine, renderer, scheduler = globalThis, canvas }) { this.engine = engine; this.renderer = renderer; this.scheduler = scheduler; this.canvas = canvas; this.timer = null; }
    advance() { this.engine.tick(); this.renderer.render(this.engine); }
    start() { if (this.timer !== null) return; this.advance(); this.timer = this.scheduler.setInterval(() => this.advance(), 100); }
    stop() { if (this.timer === null) return; this.scheduler.clearInterval(this.timer); this.timer = null; }
    bind() { const release = () => this.engine.releaseInput(); this.canvas.addEventListener('pointerdown', (event) => { event.preventDefault(); this.canvas.focus(); this.engine.pointerDown(); this.canvas.setPointerCapture?.(event.pointerId); }); this.canvas.addEventListener('pointerup', release); this.canvas.addEventListener('pointercancel', release); window.addEventListener('keydown', (event) => { if (event.code === 'Space') { event.preventDefault(); this.engine.spaceDown(); } }); window.addEventListener('keyup', (event) => { if (event.code === 'Space') { event.preventDefault(); this.engine.spaceUp(); } }); window.addEventListener('blur', release); document.addEventListener('visibilitychange', () => { if (document.hidden) release(); }); }
  }
  return { Controller };
});
