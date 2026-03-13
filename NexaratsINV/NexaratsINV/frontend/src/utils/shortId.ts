/** Characters for short IDs (no ambiguous 0/o, 1/i/l) */
const ALPHA = 'abcdefghjkmnpqrstuvwxyz23456789';

function randomChar(): string {
  return ALPHA[Math.floor(Math.random() * ALPHA.length)];
}

/** Generate a short ID for display: prefix + 4 chars (e.g. C7x2k, V9m4p). Used for optimistic UI before server responds. */
export function shortCustomerId(): string {
  return 'C' + Array.from({ length: 4 }, () => randomChar()).join('');
}

export function shortVendorId(): string {
  return 'V' + Array.from({ length: 4 }, () => randomChar()).join('');
}
