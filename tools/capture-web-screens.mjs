// Photographs web-admin screens from a RUNNING demo school (`npm run demo`, local emulators only): signs in as a demo account in headless Chrome, opens a menu item and writes a PNG.
//   node tools/capture-web-screens.mjs <out-dir> [name-filter]
// Needs Google Chrome at /Applications and the demo accounts from documentation/demo-school.md. Never point it at a real school.
import { session, login, openNav } from './lib/cdp-browser.mjs';
const OUT = process.argv[2];
const ONLY = process.argv[3];
const setVal = (sel, v) => `(()=>{const el=document.querySelector(${JSON.stringify(sel)});const proto=el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLSelectElement.prototype;const p=Object.getOwnPropertyDescriptor(el.tagName==='INPUT'?HTMLInputElement.prototype:proto,'value');p.set.call(el,${JSON.stringify(v)});el.dispatchEvent(new Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));})()`;
const jobs = [
  { who: 'academic', loc: 'en', nav: 'Notice board', name: 'web-admin-notice-board-academic-en' },
  { who: 'principal', loc: 'en', nav: 'Reported messages', name: 'web-admin-reported-messages-en' },
  { who: 'admin', loc: 'en', nav: 'Audit log', name: 'web-admin-message-audit-en' },
  { who: 'bursar', loc: 'en', nav: 'Notice board', name: 'web-admin-notice-board-bursar-en' },
  { who: 'transport', loc: 'en', nav: 'Notice board', name: 'web-admin-notice-board-transport-en' },
  { who: 'academic', loc: 'ur', nav: 'نوٹس بورڈ', name: 'web-admin-notice-board-academic-ur' },
  { who: 'principal', loc: 'en', nav: 'Reported messages', name: 'web-admin-reported-messages-open-en', act: async (s) => { await s.ev(`[...document.querySelectorAll('main button')].find(b=>/^Read the conversation/.test(b.textContent.trim())).click()`); await s.sleep(2500); } },
  { who: 'principal', loc: 'ur', nav: 'رپورٹ کیے گئے پیغامات', name: 'web-admin-reported-messages-ur' },
  { who: 'admin', loc: 'ur', nav: 'آڈٹ لاگ', name: 'web-admin-message-audit-ur' },
];
for (const j of jobs.filter((x) => !ONLY || x.name.includes(ONLY))) {
  const s = await session();
  try {
    await login(s, j.who, j.loc);
    const labels = await s.ev(`[...document.querySelectorAll('nav[aria-label] button')].map(b=>b.textContent.trim())`);
    if (!labels.includes(j.nav)) throw new Error('nav item missing: ' + j.nav + ' in ' + JSON.stringify(labels));
    await openNav(s, j.nav);
    await s.waitFor(`document.querySelector('main h1')&&document.querySelector('main h1').textContent.length>0`, 20000);
    await s.sleep(1500);
    if (j.act) await j.act(s);
    await s.shot(`${OUT}/${j.name}.png`);
    console.log('ok', j.name);
  } catch (e) { console.log('FAIL', j.name, e.message.slice(0, 300)); await s.shot(`${OUT}/${j.name}-FAIL.png`).catch(() => {}); }
  await s.close();
}
