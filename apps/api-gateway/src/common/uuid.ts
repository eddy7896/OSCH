/** Data Connect returns uuids as 32 hex digits without dashes; the API speaks the canonical dashed form. */
export const dashed = (id: string): string => {
  const h = id.replaceAll('-', '').toLowerCase();
  return h.length === 32 ? `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}` : id;
};
