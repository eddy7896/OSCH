const { createRequire } = require('node:module');
const req = createRequire(process.cwd() + '/../../../package.json');
process.env.DATA_CONNECT_EMULATOR_HOST = '127.0.0.1:9499';
const { initializeApp } = req('firebase-admin/app');
const { getDataConnect } = req('firebase-admin/data-connect');
(async () => {
  const sdk = await import(require('node:path').resolve('gen/esm/index.esm.js'));
  const app = initializeApp({ projectId: 'demo-spike' });
  const dc = getDataConnect(sdk.connectorConfig, app);
  const school = '11111111-1111-4111-8111-111111111111';
  await sdk.seedCounter(dc, { school });
  // 1) sequential numbering
  for (let i = 0; i < 20; i++) await sdk.nextReceipt(dc, { school, amountMinor: String(1000 + i) });
  let r = (await sdk.receipts(dc, { school })).data.receipts.map((x) => x.number);
  console.log('sequential 20 ->', r.join(',') === Array.from({ length: 20 }, (_, i) => i + 1).join(','), r.length);
  // 2) concurrent numbering with retry on conflict
  let conflicts = 0;
  const one = async (i) => { for (let a = 0; a < 60; a++) { try { await sdk.nextReceipt(dc, { school, amountMinor: String(2000 + i) }); return; } catch (e) { conflicts++; await new Promise((x) => setTimeout(x, Math.random() * 20)); } } throw new Error('gave up'); };
  await Promise.all(Array.from({ length: 50 }, (_, i) => one(i)));
  r = (await sdk.receipts(dc, { school })).data.receipts.map((x) => x.number);
  const unique = new Set(r).size === r.length, gapfree = r.every((n, i) => n === i + 1);
  console.log('after 50 concurrent: total', r.length, 'unique', unique, 'gap-free', gapfree, 'retries', conflicts);
  // 3) aggregates and paging
  const big = [];
  for (let n = 1; n <= 300; n++) big.push(sdk.addRow(dc, { school, amountMinor: String(9007199254740000n + BigInt(n)), n }));
  await Promise.all(big);
  const t = (await sdk.totals(dc, { school })).data.rows;
  console.log('totals raw:', JSON.stringify(t));
  let expected = 0n; for (let n = 1; n <= 300; n++) expected += 9007199254740000n + BigInt(n);
  console.log('expected sum', expected.toString());
  const seen = []; for (let off = 0; off < 300; off += 100) seen.push(...(await sdk.page(dc, { school, limit: 100, offset: off })).data.rows.map((x) => x.n));
  console.log('paging 3x100 ->', seen.length, 'ordered', seen.every((n, i) => n === i + 1));
})().catch((e) => { console.error('ERR', e.message || e); process.exit(1); });
