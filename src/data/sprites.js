/**
 * Sprite sheet manifest and helpers for frontend.
 * Each entry: path (relative to public/assets/), frame count, layout (cols×rows), pixel dimensions.
 * Add new PNG sprite sheets here so the UI can use them uniformly.
 */
export const SPRITE_MANIFEST = {
  'fish-bowl-sheet': {
    path: 'sprites/facilities/fish-bowl-sheet.png',
    frameCount: 4,
    cols: 2,
    rows: 2,
    layout: '2x2',
    sheetWidth: 256,
    sheetHeight: 256,
    frameWidth: 128,
    frameHeight: 128,
    notes: 'States: empty to full. Row-major: 0=top-left, 1=top-right, 2=bottom-left, 3=bottom-right.',
  },
};

/**
 * @param {string} id - Sprite id (e.g. 'fish-bowl-sheet').
 * @returns {{ path: string, frameCount: number, cols: number, rows: number, layout: string, sheetWidth: number, sheetHeight: number, frameWidth: number, frameHeight: number, notes?: string } | null}
 */
export function getSpriteMeta(id) {
  return SPRITE_MANIFEST[id] ?? null;
}

/**
 * Relative path from public/assets/ for the sprite image.
 * @param {string} id
 * @returns {string | null}
 */
export function getSpritePath(id) {
  const meta = getSpriteMeta(id);
  return meta ? meta.path : null;
}

/**
 * CSS background-size so one frame fills the element (e.g. '200% 200%' for 2×2).
 * @param {string} id
 * @returns {string} e.g. '200% 200%'
 */
export function getBackgroundSizeCSS(id) {
  const meta = getSpriteMeta(id);
  if (!meta) return '100% 100%';
  const { cols, rows } = meta;
  return `${(cols ?? 1) * 100}% ${(rows ?? 1) * 100}%`;
}

/**
 * CSS background-position for the given frame index (row-major).
 * @param {string} id
 * @param {number} frameIndex 0-based.
 * @returns {string} e.g. '100% 0%'
 */
export function getBackgroundPositionForFrame(id, frameIndex) {
  const meta = getSpriteMeta(id);
  if (!meta) return '0 0';
  const cols = meta.cols ?? 1;
  const rows = meta.rows ?? 1;
  const col = frameIndex % cols;
  const row = Math.floor(frameIndex / cols) % rows;
  return `${col * 100}% ${row * 100}%`;
}

/** Sprite id for the fish bowl facility (used by UI). */
export const FISH_BOWL_SPRITE_ID = 'fish-bowl-sheet';

/**
 * Apply sprite sheet frame styles to an element. Call with sprite name and frame index only.
 * @param {HTMLElement} el - Element to style (e.g. a span used as icon).
 * @param {string} spriteId - Sprite id from manifest (e.g. FISH_BOWL_SPRITE_ID).
 * @param {number} frameIndex - 0-based frame index.
 * @param {(path: string) => string} resolveUrl - Function that turns relative path into full URL (e.g. assetUrl).
 */
export function applySpriteFrame(el, spriteId, frameIndex, resolveUrl) {
  const path = getSpritePath(spriteId);
  if (!path) return;
  el.style.backgroundImage = `url(${resolveUrl(path)})`;
  el.style.backgroundSize = getBackgroundSizeCSS(spriteId);
  el.style.backgroundPosition = getBackgroundPositionForFrame(spriteId, frameIndex);
  el.style.backgroundRepeat = 'no-repeat';
}
