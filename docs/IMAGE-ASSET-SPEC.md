# Image Asset Specification

This document defines the standard **pixel dimensions**, **file formats**, and **sprite-sheet layout** for all image assets in this project. Agents and generators must follow these rules so assets are consistent and easy to use in code.

---

## 1. Pixel Dimensions

**All images must use dimensions that are 64×64 or multiples of 64.**

### 1.1 Single images (icons, tiles, characters)

| Use case        | Width × Height | Notes                    |
|-----------------|----------------|--------------------------|
| Icon / small    | 64 × 64        | Default single-tile size |
| Medium          | 128 × 128      | 2× scale                 |
| Large           | 192 × 192      | 3× scale                 |
| Banner / wide   | 256 × 128, 320 × 64, etc. | Width and height each a multiple of 64 |

**Rule:** Both width and height must be divisible by 64. Examples: 64, 128, 192, 256, 320, 384, 512.

### 1.2 Sprite sheets (animation frames)

Each **frame** in a sprite sheet must be **64×64 or a multiple of 64** (e.g. 64×64, 128×64, 128×128).

- **Frame width** = sheet width ÷ number of columns → must be a multiple of 64.
- **Frame height** = sheet height ÷ number of rows → must be a multiple of 64.

So the **total sheet size** is always a multiple of 64 in both axes. Examples:

- 4 frames in one row: **256×64** (4×64 × 64).
- 8 frames in one row: **512×64** (8×64 × 64).
- 4 frames in 2×2: **128×128** (2×64 × 2×64).
- 8 frames in 4×2: **256×128** (4×64 × 2×64).

---

## 2. File Format

- **Preferred:** **PNG** for assets that need transparency or sharp edges (sprites, UI, icons).
- **Allowed:** **WebP** for smaller size when transparency is not required; **JPEG** only when transparency is not needed and file size is a concern.
- **Naming:** Lowercase, hyphenated; extension matches format (e.g. `cat-walk.png`, `hero-banner.webp`).

---

## 3. Sprite Sheets: Layout and Splitting for Animation

### 3.1 Layout rule

- Frames are arranged in a **grid**: **columns × rows**.
- **Row-major order:** left to right, then next row. Frame index `i` (0-based):
  - **column** = `i % cols`
  - **row** = `floor(i / cols)`

### 3.2 How to split (math)

For a sprite sheet of total size `sheetWidth × sheetHeight` with `cols` columns and `rows` rows:

- **Frame width:** `frameW = sheetWidth / cols`  (must be ≥ 64 and multiple of 64)
- **Frame height:** `frameH = sheetHeight / rows` (must be ≥ 64 and multiple of 64)

**Frame index `i` → crop position (top-left of frame):**

- **X:** `(i % cols) * frameW`
- **Y:** `floor(i / cols) * frameH`

So for frame index `i`, the region is:

- X from `(i % cols) * frameW` to `(i % cols) * frameW + frameW - 1`
- Y from `floor(i / cols) * frameH` to `floor(i / cols) * frameH + frameH - 1`

### 3.3 Common layouts (all 64 or multiple of 64 per frame)

| Frames | Layout (cols × rows) | Sheet size (W×H) | Frame size |
|--------|----------------------|------------------|------------|
| 2      | 2×1                  | 128×64           | 64×64      |
| 4      | 4×1                  | 256×64           | 64×64      |
| 4      | 2×2                  | 128×128          | 64×64      |
| 6      | 6×1                  | 384×64           | 64×64      |
| 8      | 8×1                  | 512×64           | 64×64      |
| 8      | 4×2                  | 256×128          | 64×64      |
| 8      | 2×4                  | 128×256          | 64×64      |

For larger characters (e.g. 128×128 per frame):

| Frames | Layout | Sheet size (W×H) | Frame size |
|--------|--------|------------------|------------|
| 4      | 4×1    | 512×128          | 128×128    |
| 8      | 4×2    | 512×256          | 128×128    |

### 3.4 Using in code (CSS / canvas)

- **CSS background:** One div per sprite; `background-size` = full sheet size; `background-position` for frame `i`:
  - `x = -(i % cols) * frameW` (px)
  - `y = -floor(i / cols) * frameH` (px)
- **Animation:** Advance `i` over time (e.g. `i = (i + 1) % totalFrames`), update `background-position` each frame. Use `steps(totalFrames)` or equivalent so there is no interpolation between frames.

### 3.5 What to request when generating sprite sheets

When asking the MCP or any generator for a sprite sheet, specify in the prompt:

- **Frame size:** e.g. “each frame 64×64 pixels” or “128×128 per frame”.
- **Layout:** e.g. “4 frames in a single row”, “4×2 grid (4 columns, 2 rows)”.
- **Total size:** e.g. “total image 256×64” (4×64×64) or “256×128” (4×2, 64×64 per frame).
- **Style:** e.g. “pixel art”, “no gaps between frames”, “transparent background” (PNG).

This keeps generated sheets consistent with this spec and with the project’s animation code.

---

## 4. Summary Checklist for Agents

When generating or documenting image assets:

- [ ] **Dimensions:** Width and height are each **64 or a multiple of 64**.
- [ ] **Format:** Prefer **PNG**; use WebP/JPEG only when appropriate.
- [ ] **Sprite sheets:** Frame size is 64×64 or multiple; layout (cols×rows) and total size match the table above (or the same multiple-of-64 rule).
- [ ] **Splitting:** Use row-major order; frame `i` → `(i % cols) * frameW`, `floor(i / cols) * frameH`.
- [ ] **Naming:** Lowercase, hyphenated; store under `assets/`.

See **MCP-IMAGE-GENERATION-AGENT-GUIDE.md** for how to generate these assets via the ComfyUI MCP.
