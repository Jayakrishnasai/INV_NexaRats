/**
 * Generate a short human-readable ID: prefix (C or V) + 4 alphanumeric chars.
 * Example: C7x2k, V9m4p
 */
const ALPHA = 'abcdefghjkmnpqrstuvwxyz23456789'; // no ambiguous 0/o, 1/i/l

function randomChar(): string {
  return ALPHA[Math.floor(Math.random() * ALPHA.length)];
}

export function generateShortId(prefix: 'C' | 'V'): string {
  const tail = Array.from({ length: 4 }, randomChar).join('');
  return `${prefix}${tail}`;
}

/**
 * Generate a unique short ID by checking existence. Max 10 attempts.
 */
export async function generateUniqueShortId(
  prefix: 'C' | 'V',
  exists: (id: string) => Promise<boolean>
): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const id = generateShortId(prefix);
    const taken = await exists(id);
    if (!taken) return id;
  }
  // Fallback: prefix + timestamp slice to avoid infinite loop
  return `${prefix}${Date.now().toString(36).slice(-4)}`;
}
