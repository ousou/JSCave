// Written by Codex on behalf of Sebastian.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
html = html.replace('<link rel="stylesheet" href="styles.css">', `<style>${fs.readFileSync(path.join(root, 'styles.css'), 'utf8')}</style>`);
for (const file of ['src/scaling.js', 'src/engine.js', 'src/renderer.js', 'src/controller.js', 'src/main.js']) html = html.replace(`<script src="${file}"></script>`, `<script>${fs.readFileSync(path.join(root, file), 'utf8')}</script>`);
fs.writeFileSync(path.join(root, 'javacave.html'), html);
