import { Canvas, FontLibrary } from 'skia-canvas';
const F = new URL('../../../packages/flutter-core/assets/fonts/', import.meta.url).pathname;
FontLibrary.use('NotoSans', [F + 'NotoSans-Regular.ttf']);
FontLibrary.use('Deva', [F + 'NotoSansDevanagari-Regular.ttf']);
FontLibrary.use('Nastaliq', [F + 'NotoNastaliqUrdu-Regular.ttf']);
FontLibrary.use('Mal', [F + 'NotoSansMalayalam-Regular.ttf']);
FontLibrary.use('Gur', [F + 'NotoSansGurmukhi-Regular.ttf']);
const canvas = new Canvas(420, 520);
const ctx = canvas.getContext('2d');
ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 420, 520); ctx.fillStyle = 'black';
const rows = [
  ['24px NotoSans', 'Fee receipt No. 2026-0001  ₹12,500', 'ltr'],
  ['24px Deva', 'शुल्क रसीद: आशा कुमार, राशि ₹12,500', 'ltr'],
  ['30px Nastaliq', 'فیس کی رسید: آشا کمار، جماعت ۵ ب، رقم 12,500', 'rtl'],
  ['24px Mal', 'ഫീസ് രസീത്: ആശ കുമാർ, ക്ലാസ് 5 ബി', 'ltr'],
  ['24px Gur', 'ਫੀਸ ਰਸੀਦ: ਆਸ਼ਾ ਕੁਮਾਰ, ਜਮਾਤ ੫ ਬ', 'ltr'],
];
let y = 50;
for (const [font, text, dir] of rows) { ctx.font = font; ctx.direction = dir; ctx.textAlign = dir === 'rtl' ? 'right' : 'left'; ctx.fillText(text, dir === 'rtl' ? 400 : 20, y); y += 80; }
await canvas.toFile('skia.pdf');
await canvas.toFile('skia.png');
console.log('ok');
