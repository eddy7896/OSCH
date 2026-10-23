import { cleanFileName } from './student-files.service.js';

describe('cleanFileName', () => {
  it('keeps a plain name', () => expect(cleanFileName('birth certificate.pdf')).toBe('birth certificate.pdf'));
  it('drops any path the browser sent', () => {
    expect(cleanFileName('C:\\Users\\me\\scan.pdf')).toBe('scan.pdf');
    expect(cleanFileName('../../etc/passwd')).toBe('passwd');
  });
  it('replaces characters that break headers or file systems, and caps the length', () => {
    expect(cleanFileName('a"b<c>d:e|f?g*h.png')).toBe('a_b_c_d_e_f_g_h.png');
    expect(cleanFileName('line\r\nbreak.pdf')).toBe('line__break.pdf');
    expect(cleanFileName('x'.repeat(300))).toHaveLength(120);
  });
  it('never returns an empty name', () => {
    expect(cleanFileName('')).toBe('file');
    expect(cleanFileName('   ')).toBe('file');
    expect(cleanFileName('folder/')).toBe('file');
  });
});
