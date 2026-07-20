// Written by Codex on behalf of Sebastian.
(function exposeController(root, factory) { const api = factory(); root.JavaCaveController = api; if (typeof module !== 'undefined' && module.exports) module.exports = api; })(globalThis, function () {
  class Controller {
    constructor({ engine, renderer, scheduler = globalThis, canvas, windowTarget = globalThis.window, documentTarget = globalThis.document }) { this.engine = engine; this.renderer = renderer; this.scheduler = scheduler; this.canvas = canvas; this.windowTarget = windowTarget; this.documentTarget = documentTarget; this.timer = null; }
    advance() { this.engine.tick(); this.renderer.render(this.engine); }
    start() { if (this.timer !== null) return; this.advance(); this.timer = this.scheduler.setInterval(() => this.advance(), 100); }
    stop() { if (this.timer === null) return; this.scheduler.clearInterval(this.timer); this.timer = null; }
    bind() {
      const release = (event) => { event?.preventDefault(); this.engine.releaseInput(); };
      this.canvas.addEventListener('pointerdown', (event) => {
        event.preventDefault(); this.canvas.focus(); this.engine.pointerDown();
        this.canvas.setPointerCapture?.(event.pointerId);
      });
      this.canvas.addEventListener('pointerup', (event) => {
        release(event); this.canvas.releasePointerCapture?.(event.pointerId);
      });
      this.canvas.addEventListener('pointercancel', release);
      this.canvas.addEventListener('keydown', (event) => {
        if (event.code === 'Space') { event.preventDefault(); this.engine.spaceDown(); }
        if (event.code === 'Enter') { event.preventDefault(); if (!event.repeat) this.engine.activate(); }
      });
      this.canvas.addEventListener('keyup', (event) => {
        if (event.code === 'Space') { event.preventDefault(); this.engine.spaceUp(); }
        if (event.code === 'Enter') event.preventDefault();
      });
      this.windowTarget.addEventListener('blur', release);
      this.documentTarget.addEventListener('visibilitychange', () => { if (this.documentTarget.hidden) release(); });
    }
  }
  return { Controller };
});
