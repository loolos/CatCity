# MCP Image Generation – Agent Guide

This guide covers **image and sprite generation** in this project via **AutoSprite** MCP. **Agents should read this before calling image-generation tools.**

**Image dimensions, format, and sprite-sheet layout** are in **IMAGE-ASSET-SPEC.md**. AutoSprite outputs **2×2** grids for 4-frame sheets (not 1×4); the spec and this guide reflect that.

---

## 1. Overview

| MCP | Type | Purpose | Config |
|-----|------|---------|--------|
| **AutoSprite** | Cloud | Prop/character sprites, animation strips; 4-frame → **2×2** | `.cursor/mcp.json`: `type: "http"`, `url: "https://www.autosprite.io/api/mcp"`, `headers.Authorization: Bearer <API_KEY>` |

In Cursor the server may appear as e.g. `project-0-CatCity-autosprite`. Reload MCP after changing config.

---

## 2. Prerequisites

1. **API key** from [AutoSprite](https://www.autosprite.io) (sign-in required).
2. **Config** in `.cursor/mcp.json` with `url` and `headers.Authorization: Bearer <API_KEY>`.
3. **Reload MCP** (or restart Cursor) so the AutoSprite server appears. If it does not, check the key and that `https://www.autosprite.io/api/mcp` is reachable.

---

## 3. AutoSprite Tools (19)

Use these when the AutoSprite MCP server is available (e.g. `project-0-CatCity-autosprite`).

### Account

| Tool | Description |
|------|-------------|
| `get_account` | Check credit balance (call before generating). |

### Characters

| Tool | Description |
|------|-------------|
| `create_character` | Create a character from a text description. |
| `get_character` | Get character details and spritesheets. |
| `list_characters` | List characters (pagination, search). |

### Spritesheets

| Tool | Description |
|------|-------------|
| `generate_spritesheet` | Generate animations and export a spritesheet (returns usage). |
| `regenerate_spritesheet` | Regenerate at different sizes from existing video (free). |
| `get_spritesheet` | Get a spritesheet and download URL. |
| `list_spritesheets` | List spritesheets for a character. |

### Jobs

| Tool | Description |
|------|-------------|
| `get_job_status` | Check spritesheet export job status. |
| `list_jobs` | List export jobs (use jobId for status). |

### Assets (props / static objects)

| Tool | Description |
|------|-------------|
| `create_asset` | Save an asset from an image URL (from e.g. `generate_asset_preview`). |
| `get_asset` | Get asset details. |
| `list_assets` | List assets. |
| `generate_asset_preview` | Generate preview images (category, description, style). Costs 1 credit; returns 4 image URLs. |
| `generate_asset_3d_model` | Generate a 3D model from an asset image. |
| `animate_asset` | Generate an animation video from an asset. Costs 5 credits; returns `jobId`. |
| `generate_asset_spritesheet` | Generate a spritesheet from an asset’s animation (frameSize, maxFrames, removeBg). Free; returns `jobId`. |
| `get_asset_spritesheet` | Get spritesheet info and download URL. |
| `get_asset_job_status` | Check status of an asset animation or spritesheet job. Poll every ≥30 s. |

---

## 4. Project Conventions

- **Storage**: Save final assets under `public/assets/sprites/` (e.g. `facilities/<name>-sheet.png`) or `assets/` as appropriate.
- **Naming**: Lowercase, hyphenated (e.g. `fish-bowl-sheet.png`).
- **Dimensions and format**: 64×64 or multiples of 64; PNG preferred. See **IMAGE-ASSET-SPEC.md**.
- **4-frame sheets from AutoSprite**: Expect **2×2** layout; use 2×2 in code (see § 6).

---

## 5. Workflow Summary

### 5.1 AutoSprite (e.g. 4-frame prop spritesheet)

1. **Check balance**: `get_account`.
2. **Preview**: `generate_asset_preview` (category, description, style) → pick one image URL.
3. **Create asset**: `create_asset` (name, imageUrl).
4. **Animate**: `animate_asset` (assetId, animationPrompt, max 200 chars) → get `jobId`.
5. **Poll**: `get_asset_job_status(jobId)` every ≥30 s until `status === "succeeded"`.
6. **Spritesheet**: `generate_asset_spritesheet` (assetId, frameSize e.g. 128, maxFrames e.g. 4, removeBg e.g. `"default"`) → new `jobId`.
7. **Poll again**: `get_asset_job_status` until done → use returned `spritesheetUrl`.
8. **Download**: Save image to e.g. `public/assets/sprites/facilities/<name>-sheet.png`.
9. **Update the sprite manifest** (see § 5.2) so the frontend can use the new sheet.

**Note:** AutoSprite returns **2×2** for 4 frames. Do not assume 1×4. See IMAGE-ASSET-SPEC.md and § 6 below.

### 5.2 Updating the sprite manifest (JSON and JS)

After saving a new PNG sprite sheet, register it so the frontend can use it via the shared sprite API.

**Files to update:**

1. **`public/assets/sprites/sprites.json`**  
   Add an entry under `"sprites"` with key = sprite id (e.g. `"fish-bowl-sheet"`). Required fields:
   - `path` – relative to `public/assets/` (e.g. `"sprites/facilities/fish-bowl-sheet.png"`).
   - `frameCount` – number of frames (e.g. `4`).
   - `cols`, `rows` – grid columns and rows (e.g. `2`, `2` for 2×2).
   - `layout` – string like `"2x2"`.
   - `sheetWidth`, `sheetHeight` – full image size in pixels.
   - `frameWidth`, `frameHeight` – one cell size in pixels.
   - Optional: `notes` (e.g. frame meaning or order).

   The schema is in `public/assets/sprites/sprites.schema.json`; keep entries valid against it.

2. **`src/data/sprites.js`**  
   Add the same entry to the `SPRITE_MANIFEST` object so the app has the data at runtime (this is the source the UI actually uses). Use the same field names and values as in the JSON.

**Example (2×2, 4 frames, 256×256 sheet, 128×128 per frame):**

```json
"fish-bowl-sheet": {
  "path": "sprites/facilities/fish-bowl-sheet.png",
  "frameCount": 4,
  "cols": 2,
  "rows": 2,
  "layout": "2x2",
  "sheetWidth": 256,
  "sheetHeight": 256,
  "frameWidth": 128,
  "frameHeight": 128,
  "notes": "States: empty to full. Row-major: 0=top-left, 1=top-right, 2=bottom-left, 3=bottom-right."
}
```

**Flow for agents:** After downloading the PNG and noting its actual dimensions and layout (e.g. from the MCP response or by inspecting the file), add the entry to both `sprites.json` and `SPRITE_MANIFEST` in `src/data/sprites.js`. Then the UI can use `getSpriteMeta(id)`, `getSpritePath(id)`, and `getBackgroundPositionForFrame(id, frameIndex)` for that sprite.

---

## 6. End-to-End: MCP Generation to In-Game Use

This section covers **pixel/layout handling** and **black-background-as-transparent** so generated sprites work in the game. Use it as a template for multi-frame assets (e.g. facility icons).

### 6.1 Pixel and layout: 2×2 (AutoSprite)

- For 4 frames, AutoSprite returns a **2×2 grid**. The game must use 2×2.
- **Frame index → cell:** row-major: 0 = top-left, 1 = top-right, 2 = bottom-left, 3 = bottom-right.
  - `col = frameIndex % 2`, `row = Math.floor(frameIndex / 2)`.
- **Optional:** If you need 1×4 (e.g. 512×128), a script can re-layout the 2×2 image; in-game code can still use 2×2 or 1×4 as long as `background-size` and `background-position` match the actual layout.

### 6.2 Black background as transparent

- Some outputs use a solid black background. To avoid a black rectangle in the UI:
  - **Option A:** Offline: set alpha to 0 where RGB is (0,0,0); save PNG. No special CSS.
  - **Option B (recommended):** Keep the black PNG; use **`mix-blend-mode: lighten`** on the icon element. Black does not add light, so the background shows through; the sprite stays visible.

### 6.3 Using the sprite sheet in the game

- Use a **`<span>`** (or `<div>`) with **`background-image`** (not `<img src>`), so the frame is controlled by **`background-position`**.
- **2×2 layout:**
  - `background-size: 200% 200%` (one quadrant = one frame).
  - `background-position: (col*100)% (row*100)%` with `col = frameIndex % 2`, `row = Math.floor(frameIndex / 2)`.
- **Helper:** e.g. `spriteBackgroundPosition2x2(frameIndex)` returning `${col*100}% ${row*100}%`.
- **Toolbar:** Same sheet; fix position to one frame (e.g. full = last frame).
- **Board:** Per instance, set `background-position` from game state (e.g. `facilityUsage.remaining`). Store `dataset.facilityId` on the tile.
- **Per-tick updates:** Call an `update*Frames(boardEl, facilityUsage)` from the dynamic render path (e.g. `rerenderDynamic`) so icons update without re-rendering the whole board.

### 6.4 Checklist for a new multi-frame asset

1. Generate with AutoSprite and download the sprite.
2. Note **layout** (2×2, 1×4), **frame count**, and **pixel dimensions** (sheet and per frame).
3. **Update the sprite manifest:** add an entry to `public/assets/sprites/sprites.json` and to `SPRITE_MANIFEST` in `src/data/sprites.js` (see § 5.2).
4. If background is black, use alpha replacement or **`mix-blend-mode: lighten`**.
5. CSS: `background-size` and default `background-position` (e.g. 200% 200% for 2×2), or use `getBackgroundSizeCSS(id)` from the sprite module.
6. JS: map game state → `frameIndex`, set `background-position` via `getBackgroundPositionForFrame(id, frameIndex)` (or the same formula).
7. For state that changes every tick, add `update*Frames` and call it from the dynamic render path.

---

## 7. Limitations and Notes

- **AutoSprite:** Credits are consumed per call (preview, animate); spritesheet generation is free. Poll jobs every ≥30 s to avoid rate limits.
- **Tool schema:** Always read the MCP tool descriptors for exact parameters; this guide summarizes usage and project conventions.

---

## 8. References

- **IMAGE-ASSET-SPEC.md**: Pixel dimensions (64 or multiples), format (PNG), **2×2 layout** for 4-frame sheets from AutoSprite, and in-code usage.
- **AutoSprite**: [autosprite.io](https://www.autosprite.io), API at `https://www.autosprite.io/api/mcp`.
