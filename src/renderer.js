(function exposeRenderer(root, factory) { const api = factory(); root.JavaCaveRenderer = api; if (typeof module !== 'undefined' && module.exports) module.exports = api; })(globalThis, function () {
  const STATE = { TITLE: 0, GAME: 1, OVER: 2 };
  class Renderer {
    constructor(context) { this.ctx = context; this.ctx.textBaseline = 'alphabetic'; this.ctx.lineWidth = 1; }
    color(value) { this.ctx.fillStyle = value; this.ctx.strokeStyle = value; }
    text(font, color, text, x, y) { this.ctx.font = font; this.color(color); this.ctx.fillText(text, x, y); }
    render(game) { if (game.gameCount === 0) return; if (game.state === STATE.TITLE) this.title(game); else if (game.state === STATE.GAME) this.game(game); else this.over(game); }
    title(game) { const c = this.ctx; this.color('rgb(128,128,255)'); c.fillRect(0, 0, 128, 160); this.color(`rgb(0,${game.titleBlue},128)`); c.beginPath(); c.ellipse(64, 64, game.titleRadius, game.titleRadius, 0, 0, Math.PI * 2); c.fill(); this.text('bold 32px Times New Roman', '#000', 'SFCave', 15, 50); this.text('bold 32px Times New Roman', '#fff', 'SFCave', 10, 45); this.text('bold 16px Times New Roman', '#f00', 'Click to start!', 10, 80); this.text('bold 16px Times New Roman', '#fff', `Score   : ${game.score}`, 10, 110); this.text('bold 16px Times New Roman', '#fff', `HiScore : ${game.highScore}`, 10, 130); }
    pixelLine(x0, y0, x1, y1) { const c = this.ctx; const dx = Math.abs(x1 - x0); const sx = x0 < x1 ? 1 : -1; const dy = -Math.abs(y1 - y0); const sy = y0 < y1 ? 1 : -1; let error = dx + dy; while (true) { c.fillRect(x0, y0, 1, 1); if (x0 === x1 && y0 === y1) return; const twiceError = error * 2; if (twiceError >= dy) { error += dy; x0 += sx; } if (twiceError <= dx) { error += dx; y0 += sy; } } }
    game(game) {
      const c = this.ctx;
      for (let i = 0; i < 32; i += 1) {
        const shade = Math.abs(((game.gameCount + i) % 16) - 8) * 16;
        this.color(`rgb(${128 - shade},255,${128 - shade})`); c.fillRect(i * 4, 0, 4, 128);
        this.color(`rgb(${shade},0,0)`); c.fillRect(i * 4, game.map[0][i], 4, game.map[1][i] - game.map[0][i]);
        if (game.map[2][i] !== -1) { this.color('rgb(0,255,128)'); c.fillRect(i * 4, game.map[2][i], 4, 16); }
      }
      this.color('rgb(128,128,255)'); c.fillRect(0, 128, 128, 32);
      this.text('bold 16px Times New Roman', '#fff', `Score : ${game.score}`, 20, 150);
      this.color('rgb(128,128,255)');
      for (const [index, segment] of game.wormSegments.entries()) {
        const startX = 30 - ((game.wormSegments.length - index - 1) * 4);
        for (const offset of [-1, 0, 1]) this.pixelLine(startX, segment.startY + offset, startX + 4, segment.endY + offset);
      }
    }
    over(game) { const c = this.ctx; if (game.gameCount < 20) { const r = game.gameCount * 2; this.color('#f00'); c.beginPath(); c.ellipse(32, game.y, r, r, 0, 0, Math.PI * 2); c.stroke(); } if (game.gameCount === 20) { this.text('bold 24px Times New Roman', '#00f', 'GameOver', 7, 50); if (game.highScore < game.score) this.text('bold 24px Times New Roman', 'rgb(255,128,0)', 'HiScore!!', 13, 100); } }
  }
  return { Renderer };
});
