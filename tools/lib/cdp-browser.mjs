import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function session(port = 9333) {
  const dir = mkdtempSync(join(tmpdir(), 'oru-chrome-'));
  const proc = spawn(CHROME, [`--remote-debugging-port=${port}`, `--user-data-dir=${dir}`, '--headless=new', '--no-first-run', '--disable-gpu', '--hide-scrollbars', '--window-size=1280,1000', '--host-resolver-rules=MAP *.localhost 127.0.0.1', 'about:blank'], { stdio: 'ignore' });
  let list;
  for (let i = 0; i < 50; i++) { try { list = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (list.length) break; } catch {} await sleep(200); }
  const page = list.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0; const pending = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { const { res, rej } = pending.get(d.id); pending.delete(d.id); d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result); } };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300)); return r.result.value; };
  const waitFor = async (expr, ms = 20000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(expr)) return true; } catch {} await sleep(250); } throw new Error('timeout: ' + expr.slice(0, 120)); };
  return {
    ev, waitFor, sleep,
    goto: async (url) => { await send('Page.navigate', { url }); await sleep(800); },
    shot: async (file) => {
      const h = await ev('Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)');
      await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: Math.min(Math.max(h, 700), 2600), deviceScaleFactor: 1, mobile: false });
      await sleep(400);
      const r = await send('Page.captureScreenshot', { format: 'png' });
      writeFileSync(file, Buffer.from(r.data, 'base64'));
      await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    },
    close: async () => { try { ws.close(); } catch {} proc.kill(); await sleep(300); },
  };
}

export const login = async (s, email, loc = 'en') => {
  await s.goto(`http://greenfield.localhost:3102/${loc}`);
  await s.waitFor(`!!document.querySelector('input[type=email], input[type=text]')`, 60000);
  await s.ev(`(async()=>{
    const set=(el,v)=>{const p=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');p.set.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}));};
    const em=document.querySelector('input[type=email]')||document.querySelector('input[type=text]');
    const pw=document.querySelector('input[type=password]');
    set(em,'${email}@demo.oruschools.example'); set(pw,'demo-pass-2027');
    const btn=pw.form?.querySelector('button[type=submit]')||[...document.querySelectorAll('button')].find(b=>/^sign in$/i.test(b.textContent.trim()));
    btn.click(); return true;})()`);
  await s.waitFor(`!!document.querySelector('nav[aria-label]')`, 60000);
};
export const openNav = async (s, label) => {
  await s.ev(`[...document.querySelectorAll('nav[aria-label] button')].find(b=>b.textContent.trim()===${JSON.stringify(label)}).click()`);
  await s.sleep(1500);
};
