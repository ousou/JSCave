#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const outputPath = path.join(root, 'jscave.html');
const scriptFiles = ['src/scaling.js', 'src/engine.js', 'src/renderer.js', 'src/controller.js', 'src/main.js'];

function buildStandalone(baseDirectory = root) {
  let html = fs.readFileSync(path.join(baseDirectory, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(baseDirectory, 'styles.css'), 'utf8');
  html = html.replace('<link rel="stylesheet" href="styles.css">', `<style>${css}</style>`);
  for (const file of scriptFiles) {
    html = html.replace(`<script src="${file}"></script>`, `<script>${fs.readFileSync(path.join(baseDirectory, file), 'utf8')}</script>`);
  }
  return html;
}

function writeStandalone(baseDirectory = root) {
  const output = path.join(baseDirectory, 'jscave.html');
  fs.writeFileSync(output, buildStandalone(baseDirectory));
  return output;
}

function checkStandalone(baseDirectory = root) {
  const output = path.join(baseDirectory, 'jscave.html');
  return fs.existsSync(output) && fs.readFileSync(output, 'utf8') === buildStandalone(baseDirectory);
}

function main(arguments_) {
  if (arguments_.length === 0) {
    writeStandalone();
    process.stdout.write(`${path.relative(root, outputPath)} regenerated\n`);
    return;
  }
  if (arguments_.length === 1 && arguments_[0] === '--check') {
    if (!checkStandalone()) {
      process.stderr.write('jscave.html is stale; run node scripts/package.js\n');
      process.exitCode = 1;
    } else {
      process.stdout.write('jscave.html is up to date\n');
    }
    return;
  }
  throw new Error('Usage: node scripts/package.js [--check]');
}

if (require.main === module) main(process.argv.slice(2));

module.exports = { buildStandalone, checkStandalone, writeStandalone };
