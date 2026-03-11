# Image Asset Specification

This document defines **pixel dimensions**, **file formats**, and **sprite-sheet layout** for image assets in this project. It reflects the fact that **AutoSprite MCP** (used for prop/asset sprites) outputs **2×2 grids** for 4-frame sheets rather than 1×4 strips. All generators and in-game code should follow these rules for consistency.

---

## 1. Pixel Dimensions

**All images must use dimensions that are 64×64 or multiples of 64.**

### 1.1 Single images (icons, tiles, characters)

| Use case        | Width × Height | Notes                    |
|-----------------|----------------|--------------------------|
| Icon / small    | 64 × 64        | Default single-tile size |
| Medium          | 128 × 128      | 2× scale                 |
| Large           | 192 × 192      | 3× scale                 |
| Banner / wide   | 256 × 128, 320 × 64, etc. | Each axis a multiple of 64 |

**Rule:** Both width and height must be divisible by 64.

### 1.2 Sprite sheets (animation / state frames)

- Each **frame** must be **64×64 or a multiple of 64** (e.g. 64×64, 128×128).
- **Frame width** = sheet width ÷ columns → multiple of 64.
- **Frame height** = sheet height ÷ rows → multiple of 64.

**AutoSprite MCP behaviour:** For 4 frames, the API returns a **2×2 grid** (not 1×4). The game and this spec treat 4-frame sheets as **2×2** by default.

- 4 frames, 2×2 (AutoSprite default): **256×256** (2×128 × 2×128) or **128×128** (2×64 × 2×64).
- 4 frames, 1×4 (if re-laid out by script): **512×128** (4×128 × 128) or **256×64** (4×64 × 64).
- Other layouts (custom or re-laid from 2×2): same multiple-of-64 rule; see layout table below.

---

## 2. File Format

- **Preferred:** **PNG** for sprites, UI, icons (transparency or sharp edges).
- **Allowed:** **WebP** when transparency not required; **JPEG** only when no transparency and size matters.
- **Naming:** Lowercase, hyphenated; extension matches format (e.g. `fish-bowl-sheet.png`).

---

## 3. Sprite Sheets: Layout and Splitting

### 3.1 Layout rule (row-major)

- Frames are in a **grid: columns × rows**.
- **Row-major order:** left to right, then next row. Frame index `i` (0-based):
  - **column** = `i % cols`
  - **row** = `floor(i / cols)`

### 3.2 4-frame sheets: 2×2 (AutoSprite default)

When using **AutoSprite MCP**, a 4-frame spritesheet is delivered as **2×2**, not 1×4. Use this layout in code and in this spec.

| Frame index | Column | Row  | Position in sheet |
|-------------|--------|------|--------------------|
| 0           | 0      | 0    | Top-left           |
| 1           | 1      | 0    | Top-right          |
| 2           | 0      | 1    | Bottom-left        |
| 3           | 1      | 1    | Bottom-right       |

- **col** = `frameIndex % 2`
- **row** = `Math.floor(frameIndex / 2)`

**Frame index `i` → crop position (top-left):**

- **X:** `(i % 2) * frameW`
- **Y:** `Math.floor(i / 2) * frameH`

**Sheet size examples (2×2):** 128×128 (64×64 per frame), 256×256 (128×128 per frame).

### 3.3 Common layouts (all multiples of 64 per frame)

| Frames | Layout (cols×rows) | Sheet size (W×H) | Frame size | Notes                    |
|--------|--------------------|------------------|------------|--------------------------|
| 4      | **2×2**            | 128×128 or 256×256 | 64×64 or 128×128 | **AutoSprite default**   |
| 2      | 2×1                | 128×64           | 64×64      |                          |
| 4      | 4×1                | 256×64           | 64×64      | Requires re-layout from 2×2 if from AutoSprite |
| 6      | 6×1 or 3×2         | 384×64, 192×128 | 64×64      |                          |
| 8      | 4×2 or 8×1         | 256×128, 512×64 | 64×64      |                          |

### 3.4 Using 2×2 in code (CSS)

For a **2×2** sheet, one frame fills the element when:

- **background-size:** `200% 200%` (full image is 2× element width and height; one quadrant = one frame).
- **background-position:** `x% y%` where:
  - `x = (frameIndex % 2) * 100`
  - `y = Math.floor(frameIndex / 2) * 100`

So: frame 0 → `0% 0%`, frame 1 → `100% 0%`, frame 2 → `0% 100%`, frame 3 → `100% 100%`.

**Helper (e.g. in `src/ui.js`):**

```js
function spriteBackgroundPosition2x2(frameIndex) {
  const col = frameIndex % 2;
  const row = Math.floor(frameIndex / 2);
  return `${col * 100}% ${row * 100}%`;
}
```

### 3.5 What to request when generating

- **From AutoSprite:** Request 4 frames; expect **2×2** output. Do not assume 1×4.
- **Frame size:** e.g. “each frame 128×128” or “64×64 per cell”.
- **Layout:** For AutoSprite, “4 frames” → 2×2. If you re-layout to 1×4 via script, request “2×2 grid” from the source and convert offline.
- **Style:** “no gaps between frames”, “PNG”, “transparent or black background” (black can be made transparent in-game with `mix-blend-mode: lighten`).

---

## 4. Summary Checklist for Agents

- [ ] **Dimensions:** Width and height each **64 or a multiple of 64**.
- [ ] **Format:** Prefer **PNG**.
- [ ] **4-frame sheets from AutoSprite:** Treat as **2×2**; use `background-size: 200% 200%` and position `(col*100)% (row*100)%`.
- [ ] **Splitting:** Row-major; frame `i` → column `i % cols`, row `floor(i / cols)`.
- [ ] **Naming:** Lowercase, hyphenated; store under `public/assets/sprites/` or `assets/` as appropriate.

For MCP-based generation (AutoSprite) and in-game usage (black-as-transparent, 2×2 display), see **MCP-IMAGE-GENERATION-AGENT-GUIDE.md**.

---

## 5. Sprite manifest (management system)

PNG sprite sheets are registered in a **manifest** so the frontend can use them in one place.

- **Data:** `src/data/sprites.js` exports `SPRITE_MANIFEST` and helpers. A mirror JSON is at `public/assets/sprites/sprites.json` (optional, for tooling).
- **Per-sprite fields:** `path` (relative to `public/assets/`), `frameCount`, `cols`, `rows`, `layout` (e.g. `"2x2"`), `sheetWidth`, `sheetHeight`, `frameWidth`, `frameHeight`, optional `notes`.
- **Frontend API:** `getSpriteMeta(id)`, `getSpritePath(id)`, `getBackgroundSizeCSS(id)`, `getBackgroundPositionForFrame(id, frameIndex)`. Use these when rendering sprite icons so layout and dimensions stay consistent.
- **Adding a sprite:** Add an entry to `SPRITE_MANIFEST` in `src/data/sprites.js` (and optionally to `sprites.json`) with the correct frame count and pixel dimensions; then use the sprite id and helpers in the UI.
