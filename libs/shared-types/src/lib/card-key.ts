/**
 * Human-readable card key, tracker-style: PREFIX + boardSeq + '-' + cardNumber
 * (e.g. board «Разработка» #2, card #15 → "РАЗР2-15"). Single source of truth
 * shared by web (display, permalink) and any other consumer.
 */

/** First 4 letters/digits of the board name, uppercased. Falls back to "BRD". */
export function boardPrefix(name: string): string {
  const cleaned = name.replace(/[^\p{L}\p{N}]/gu, '').slice(0, 4);
  return cleaned ? cleaned.toUpperCase() : 'BRD';
}

export function formatCardKey(
  boardName: string,
  boardSeq: number,
  cardNumber: number,
): string {
  return `${boardPrefix(boardName)}${boardSeq}-${cardNumber}`;
}

/**
 * Extract the per-board card number from a key ("РАЗР2-15" → 15) or a raw
 * number string ("15" → 15). The number is the segment after the last "-".
 * Returns null for anything else (e.g. a legacy cuid, which has no "-" and is
 * not all digits), so callers can fall back to id-based lookup.
 */
export function parseCardNumber(key: string): number | null {
  const tail = key.slice(key.lastIndexOf('-') + 1);
  return /^\d+$/.test(tail) ? Number(tail) : null;
}
