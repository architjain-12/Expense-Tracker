/**
 * Browser-safe ID generator.
 *
 * crypto.randomUUID() is not available in every localhost/browser context.
 * We prefer it when available, then fall back to crypto.getRandomValues,
 * and finally to a timestamp/random combination so local development still works.
 */
export function newId(prefix = ''): string {
  const globalCrypto = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  let id: string;
  if (globalCrypto?.randomUUID) {
    id = globalCrypto.randomUUID();
  } else if (globalCrypto?.getRandomValues) {
    const bytes = new Uint8Array(16);
    globalCrypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  } else {
    id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  }
  return prefix ? `${prefix}-${id}` : id;
}
