/**
 * Predefined palette used for per-membership colors within a project.
 * Distinguishable hues; used for auto-assignment and as the owner-facing picker.
 * Single source of truth shared by api (auto-assign) and web (picker).
 */
export const MEMBER_COLOR_PALETTE: readonly string[] = [
  '#e11d48', // rose
  '#f59e0b', // amber
  '#10b981', // emerald
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#6366f1', // indigo
  '#84cc16', // lime
  '#06b6d4', // cyan
  '#64748b', // slate (default fallback)
];

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export function isValidHexColor(value: string): boolean {
  return HEX_COLOR_RE.test(value);
}

/**
 * Pick the first palette color not already used by an existing membership in
 * the project. If every palette color is taken, cycle by membership count.
 */
export function pickNextMemberColor(usedColors: readonly string[]): string {
  const used = new Set(usedColors.map((c) => c.toLowerCase()));
  const free = MEMBER_COLOR_PALETTE.find((c) => !used.has(c.toLowerCase()));
  if (free) return free;
  return MEMBER_COLOR_PALETTE[usedColors.length % MEMBER_COLOR_PALETTE.length];
}
