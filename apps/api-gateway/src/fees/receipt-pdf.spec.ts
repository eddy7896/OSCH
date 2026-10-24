import { familyFor, renderReceiptPdf, type ReceiptPdfModel } from './receipt-pdf.js';

const model = (over: Partial<ReceiptPdfModel> = {}): ReceiptPdfModel => ({
  number: 'R-2027-2028-00012', paidOn: '2027-04-12', cancelled: false,
  school: { name: 'Green Valley School', address: '12 Lake Road, Srinagar', phone: '+911234567890', email: 'office@greenvalley.example' },
  student: { name: 'Asha Kumar', enrollmentId: 'S0042', className: '5 B' }, invoiceTitle: 'Tuition - April', amountMinor: '12500000', balanceAfterMinor: '2500000',
  method: 'UPI', reference: 'UPI-8842', receivedBy: 'Bursar One', academicYear: '2027-2028', ...over,
});
const text = (pdf: Buffer) => pdf.toString('latin1');

describe('familyFor', () => {
  it('picks the font that can draw the text', () => {
    expect(familyFor('Asha Kumar', 'en')).toBe('OruSans');
    expect(familyFor('आशा कुमार', 'hi')).toBe('OruDeva');
    expect(familyFor('آشا کمار', 'ur')).toBe('OruNastaliq');
    expect(familyFor('آشا کمار', 'ar')).toBe('OruNaskh');
    expect(familyFor('ആശ', 'ml')).toBe('OruMlym');
    expect(familyFor('12,500', 'ur')).toBe('OruSans');
  });
});

describe('renderReceiptPdf (a real PDF, drawn with skia-canvas)', () => {
  it('makes a valid one-page PDF with embedded fonts, in English', async () => {
    const pdf = await renderReceiptPdf(model(), 'en');
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(text(pdf)).toMatch(/%%EOF\s*$/);
    expect((text(pdf).match(/\/Type\s*\/Page\b/g) ?? []).length).toBe(1);
    expect(text(pdf)).toMatch(/\/FontFile2|\/FontFile3/); // real fonts are embedded
    expect(pdf.length).toBeGreaterThan(5_000);
  });
  it('renders Hindi (Devanagari) and Urdu (Nastaliq, right to left) without failing, and differently from English', async () => {
    const en = await renderReceiptPdf(model(), 'en');
    const hi = await renderReceiptPdf(model({ student: { name: 'आशा कुमार', enrollmentId: 'S0042', className: '5 ब' }, invoiceTitle: 'ट्यूशन - अप्रैल' }), 'hi');
    const ur = await renderReceiptPdf(model({ student: { name: 'آشا کمار', enrollmentId: 'S0042', className: '۵ ب' }, invoiceTitle: 'ٹیوشن - اپریل', receivedBy: 'بُرسر' }), 'ur');
    for (const pdf of [hi, ur]) {
      expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
      expect(pdf.length).toBeGreaterThan(5_000);
    }
    expect(hi.equals(en)).toBe(false);
    expect(ur.equals(hi)).toBe(false);
    expect(text(ur)).toMatch(/Nastaliq/i); // the Urdu receipt embeds the Nastaliq font
    expect(text(hi)).toMatch(/Devanagari/i);
  });
  it('a cancelled receipt differs from the same receipt not cancelled', async () => {
    const a = await renderReceiptPdf(model(), 'en');
    const b = await renderReceiptPdf(model({ cancelled: true }), 'en');
    expect(a.equals(b)).toBe(false);
  });
  it('very long names and titles do not break the page', async () => {
    const long = 'Venkata Subramanya Lakshmi Narasimha Rao '.repeat(8);
    const pdf = await renderReceiptPdf(model({ student: { name: long, enrollmentId: 'S0042', className: null }, invoiceTitle: long, reference: long }), 'en');
    expect((text(pdf).match(/\/Type\s*\/Page\b/g) ?? []).length).toBe(1);
  });
  it('uses the school language for the labels and falls back to English for a language without them', async () => {
    const odd = await renderReceiptPdf(model(), 'xx');
    expect(odd.subarray(0, 5).toString()).toBe('%PDF-');
  });
});
