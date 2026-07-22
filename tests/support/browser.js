const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const DEFAULT_TIMEOUT = 10_000;

function withTimeout(promise, milliseconds, message) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${message} after ${milliseconds} ms`)), milliseconds);
    }),
  ]).finally(() => clearTimeout(timer));
}

function once(target, event) {
  return new Promise((resolve, reject) => {
    const onEvent = (...args) => { cleanup(); resolve(args); };
    const onError = (error) => { cleanup(); reject(error); };
    const cleanup = () => {
      target.removeEventListener?.(event, onEvent);
      target.removeEventListener?.('error', onError);
    };
    target.addEventListener(event, onEvent, { once: true });
    target.addEventListener('error', onError, { once: true });
  });
}

class CdpBrowser {
  static async launch(options = {}) {
    const executable = options.executable || process.env.CHROME_BIN || 'google-chrome';
    const timeout = options.timeout || DEFAULT_TIMEOUT;
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'jscave-chrome-'));
    const args = [
      '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-background-networking',
      '--disable-component-update', '--disable-default-apps', '--disable-extensions',
      '--disable-sync', '--metrics-recording-only', '--no-first-run', '--remote-debugging-port=0',
      `--user-data-dir=${profile}`, 'about:blank',
    ];
    const child = spawn(executable, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let diagnostics = '';
    const endpoint = new Promise((resolve, reject) => {
      const inspect = (chunk) => {
        diagnostics += chunk;
        const match = diagnostics.match(/DevTools listening on (ws:\/\/[^\s]+)/);
        if (match) resolve(match[1]);
      };
      child.stdout.on('data', inspect);
      child.stderr.on('data', inspect);
      child.once('error', (error) => reject(new Error(`Chrome failed to launch (${executable}): ${error.message}`)));
      child.once('exit', (code, signal) => reject(new Error(`Chrome exited before CDP was ready (${code ?? signal}):\n${diagnostics}`)));
    });
    let browser;
    try {
      const webSocketUrl = await withTimeout(endpoint, timeout, `Chrome did not expose a DevTools endpoint (${executable})`);
      browser = new CdpBrowser({ child, profile, webSocketUrl, timeout, diagnostics: () => diagnostics });
      await browser.connect();
      return browser;
    } catch (error) {
      child.kill('SIGKILL');
      fs.rmSync(profile, { recursive: true, force: true });
      throw error;
    }
  }

  constructor({ child, profile, webSocketUrl, timeout, diagnostics }) {
    this.child = child;
    this.profile = profile;
    this.webSocketUrl = webSocketUrl;
    this.timeout = timeout;
    this.diagnostics = diagnostics;
    this.nextId = 0;
    this.pending = new Map();
    this.waiters = new Map();
    this.networkRequests = [];
    this.consoleMessages = [];
    this.exceptions = [];
    this.closed = false;
  }

  async connect() {
    this.socket = new WebSocket(this.webSocketUrl);
    await withTimeout(once(this.socket, 'open'), this.timeout, 'CDP WebSocket did not open');
    this.socket.addEventListener('message', (event) => this.onMessage(event.data));
    this.socket.addEventListener('close', () => {
      for (const { reject } of this.pending.values()) reject(new Error('CDP connection closed while a command was pending'));
      this.pending.clear();
    });
    const { targetId } = await this.command('Target.createTarget', { url: 'about:blank' }, null);
    const { sessionId } = await this.command('Target.attachToTarget', { targetId, flatten: true }, null);
    this.sessionId = sessionId;
    await Promise.all([
      this.command('Page.enable'),
      this.command('Runtime.enable'),
      this.command('Network.enable'),
      this.command('Log.enable'),
    ]);
  }

  onMessage(data) {
    const message = JSON.parse(data);
    if (message.id) {
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(`${pending.method}: ${message.error.message}`));
      else pending.resolve(message.result);
      return;
    }
    if (message.sessionId && message.sessionId !== this.sessionId) return;
    if (message.method === 'Network.requestWillBeSent') this.networkRequests.push(message.params.request.url);
    if (message.method === 'Runtime.consoleAPICalled') {
      this.consoleMessages.push({
        type: message.params.type,
        text: message.params.args.map((argument) => argument.value ?? argument.description ?? '').join(' '),
      });
    }
    if (message.method === 'Runtime.exceptionThrown') this.exceptions.push(message.params.exceptionDetails);
    const waiters = this.waiters.get(message.method);
    if (waiters?.length) waiters.shift()(message.params);
  }

  command(method, params = {}, sessionId = this.sessionId) {
    if (this.closed) return Promise.reject(new Error(`cannot run ${method}: browser is closed`));
    const id = ++this.nextId;
    return withTimeout(new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, method });
      this.socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    }), this.timeout, `CDP command ${method} timed out; Chrome may be unresponsive\n${this.diagnostics()}`);
  }

  waitFor(method) {
    return withTimeout(new Promise((resolve) => {
      const waiters = this.waiters.get(method) || [];
      waiters.push(resolve);
      this.waiters.set(method, waiters);
    }), this.timeout, `CDP event ${method} timed out; page may be unresponsive`);
  }

  async navigate(url) {
    const loaded = this.waitFor('Page.loadEventFired');
    const result = await this.command('Page.navigate', { url });
    if (result.errorText) throw new Error(`navigation failed for ${url}: ${result.errorText}`);
    await loaded;
    return this.evaluate('location.href');
  }

  async evaluate(expression) {
    const result = await this.command('Runtime.evaluate', {
      expression, awaitPromise: true, returnByValue: true,
    });
    if (result.exceptionDetails) {
      throw new Error(`evaluation failed: ${result.exceptionDetails.text}\n${result.exceptionDetails.exception?.description || ''}`);
    }
    return result.result.value;
  }

  resize(width, height) {
    return this.command('Emulation.setDeviceMetricsOverride', {
      width, height, deviceScaleFactor: 1, mobile: false,
    });
  }

  async key(code, type = 'keyDown', options = {}) {
    const keys = {
      Enter: { key: 'Enter', code: 'Enter', keyCode: 13 },
      Space: { key: ' ', code: 'Space', keyCode: 32 },
      Tab: { key: 'Tab', code: 'Tab', keyCode: 9 },
    };
    const key = keys[code];
    if (!key) throw new RangeError(`unsupported test key: ${code}`);
    return this.command('Input.dispatchKeyEvent', {
      type, key: key.key, code: key.code, windowsVirtualKeyCode: key.keyCode,
      nativeVirtualKeyCode: key.keyCode, autoRepeat: Boolean(options.repeat),
    });
  }

  pointer(type, x, y, options = {}) {
    const protocolType = { down: 'mousePressed', up: 'mouseReleased', move: 'mouseMoved' }[type];
    if (!protocolType) throw new RangeError(`unsupported pointer event: ${type}`);
    return this.command('Input.dispatchMouseEvent', {
      type: protocolType, x, y, button: type === 'move' ? 'none' : 'left',
      buttons: type === 'down' ? 1 : 0, clickCount: type === 'move' ? 0 : 1,
      pointerType: options.pointerType || 'mouse',
    });
  }

  touchCancel() {
    return this.command('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  }

  async touch(type, x, y) {
    const protocolType = { start: 'touchStart', end: 'touchEnd', cancel: 'touchCancel' }[type];
    if (!protocolType) throw new RangeError(`unsupported touch event: ${type}`);
    await this.command('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    return this.command('Input.dispatchTouchEvent', {
      type: protocolType,
      touchPoints: type === 'start' ? [{ x, y, radiusX: 1, radiusY: 1, force: 1, id: 1 }] : [],
    });
  }

  async canvasPixels(selector = '#game', x = 0, y = 0, width = 128, height = 160) {
    return this.evaluate(`(() => {
      const canvas = document.querySelector(${JSON.stringify(selector)});
      return Array.from(canvas.getContext('2d').getImageData(${x}, ${y}, ${width}, ${height}).data);
    })()`);
  }

  async screenshot(clip) {
    const result = await this.command('Page.captureScreenshot', {
      format: 'png', fromSurface: true, ...(clip ? { clip: { ...clip, scale: 1 } } : {}),
    });
    return Buffer.from(result.data, 'base64');
  }

  assertHealthy({ allowedRequest = () => true } = {}) {
    const external = this.networkRequests.filter((url) => !allowedRequest(url));
    if (external.length) throw new Error(`unexpected network requests:\n${external.join('\n')}`);
    const consoleErrors = this.consoleMessages.filter(({ type }) => type === 'error' || type === 'assert');
    if (consoleErrors.length || this.exceptions.length) {
      throw new Error(`browser runtime errors:\n${JSON.stringify({ consoleErrors, exceptions: this.exceptions }, null, 2)}`);
    }
  }

  async close() {
    if (this.closed) return;
    this.closed = true;
    try {
      const id = ++this.nextId;
      this.socket.send(JSON.stringify({ id, method: 'Browser.close' }));
    } catch {}
    const exited = new Promise((resolve) => this.child.once('exit', resolve));
    try {
      await withTimeout(exited, 3_000, 'Chrome process did not exit after Browser.close');
    } catch (error) {
      this.child.kill('SIGKILL');
      await withTimeout(exited, 3_000, 'Chrome process resisted SIGKILL');
      throw error;
    } finally {
      this.socket.close();
      fs.rmSync(this.profile, { recursive: true, force: true });
    }
  }
}

module.exports = { CdpBrowser, withTimeout };
