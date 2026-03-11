# MCP Image Generation – Agent Guide

This guide covers **image and sprite generation** in this project via two MCP options: **ComfyUI** (local) and **AutoSprite** (cloud). **Agents should read this before calling image-generation tools.**

**Image dimensions, format, and sprite-sheet layout** are in **IMAGE-ASSET-SPEC.md**. AutoSprite outputs **2×2** grids for 4-frame sheets (not 1×4); the spec and this guide reflect that.

---

## 1. Overview

| MCP        | Type   | Purpose                                      | Config / URL |
|------------|--------|----------------------------------------------|--------------|
| **ComfyUI** | Local  | Prompt-based image generation; custom size/style | `.cursor/mcp.json`; `streamable-http` at `http://127.0.0.1:9000/mcp` |
| **AutoSprite** | Cloud | Prop/character sprites, animation strips; 4-frame → **2×2** | `.cursor/mcp.json`; `type: "http"`, `url: "https://www.autosprite.io/api/mcp"`, `Authorization: Bearer <API_KEY>` |

In Cursor the AutoSprite server may appear as e.g. `project-0-CatCity-autosprite`. Reload MCP after changing config.

---

## 2. Prerequisites

### 2.1 ComfyUI

1. **ComfyUI** must be running locally (default port **8188**).
2. **ComfyUI MCP Server** must be running (e.g. `scripts/run-comfyui-mcp.ps1` or `run-comfyui-mcp.bat`). It listens at `http://127.0.0.1:9000/mcp`.
3. At least one usable checkpoint model (e.g. under `models/checkpoints/` in the ComfyUI install).

If the server or ComfyUI is not running, tool calls will fail; the agent cannot start them.

### 2.2 AutoSprite

1. **API key** from [AutoSprite](https://www.autosprite.io) (sign-in required).
2. **Config** in `.cursor/mcp.json` with `url` and `headers.Authorization: Bearer <API_KEY>`.
3. **Reload MCP** (or restart Cursor) so the AutoSprite server appears. If it does not, check the key and that `https://www.autosprite.io/api/mcp` is reachable.

---

## 3. ComfyUI Tools

Use these when the ComfyUI MCP server is available.

| Tool | Use |
|------|-----|
| `generate_image` | Create an image from a prompt. Params: `prompt` (required), `width`, `height`, etc. Request 64×64 or multiples (see IMAGE-ASSET-SPEC.md). |
| `view_image` | View a generated image by `asset_id`. |
| `regenerate` | Create a new image from an existing asset with overrides. |
| `list_assets` | List recent assets. |
| `publish_asset` | Write an asset to the project (e.g. `assets/`). Params: `asset_id`, optional `target_filename`. |
| `list_models` | List available checkpoint models. |
| `get_defaults` / `set_defaults` | Get or set default generation parameters. |
| `get_job` / `get_queue_status` / `cancel_job` | Check or cancel jobs. |

**Workflow (ComfyUI):** Check server is up → call `generate_image` with prompt and size → optionally `view_image` → `publish_asset` or document where the file was written.

---

## 4. AutoSprite Tools (19)

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

## 5. Project Conventions

- **Storage**: Save final assets under `public/assets/sprites/` (e.g. `facilities/<name>-sheet.png`) or `assets/` as appropriate.
- **Naming**: Lowercase, hyphenated (e.g. `fish-bowl-sheet.png`).
- **Dimensions and format**: 64×64 or multiples of 64; PNG preferred. See **IMAGE-ASSET-SPEC.md**.
- **4-frame sheets from AutoSprite**: Expect **2×2** layout; use 2×2 in code (see § 7).

---

## 6. Workflow Summary

### 6.1 ComfyUI

1. Ensure ComfyUI and MCP server are running.
2. Call `generate_image` with prompt and width/height (64 or multiple).
3. Optionally `view_image`; then `publish_asset` or document the output path.
4. Reference the asset path in the project.

### 6.2 AutoSprite (e.g. 4-frame prop spritesheet)

1. **Check balance**: `get_account`.
2. **Preview**: `generate_asset_preview` (category, description, style) → pick one image URL.
3. **Create asset**: `create_asset` (name, imageUrl).
4. **Animate**: `animate_asset` (assetId, animationPrompt, max 200 chars) → get `jobId`.
5. **Poll**: `get_asset_job_status(jobId)` every ≥30 s until `status === "succeeded"`.
6. **Spritesheet**: `generate_asset_spritesheet` (assetId, frameSize e.g. 128, maxFrames e.g. 4, removeBg e.g. `"default"`) → new `jobId`.
7. **Poll again**: `get_asset_job_status` until done → use returned `spritesheetUrl`.
8. **Download**: Save image to e.g. `public/assets/sprites/facilities/<name>-sheet.png`.

**Note:** AutoSprite returns **2×2** for 4 frames. Do not assume 1×4. See IMAGE-ASSET-SPEC.md and § 7 below.

---

## 7. End-to-End: MCP Generation to In-Game Use

This section covers **pixel/layout handling** and **black-background-as-transparent** so generated sprites work in the game. Use it as a template for multi-frame assets (e.g. facility icons).

### 7.1 Pixel and layout: 2×2 (AutoSprite)

- For 4 frames, AutoSprite returns a **2×2 grid**. The game must use 2×2.
- **Frame index → cell:** row-major: 0 = top-left, 1 = top-right, 2 = bottom-left, 3 = bottom-right.
  - `col = frameIndex % 2`, `row = Math.floor(frameIndex / 2)`.
- **Optional:** If you need 1×4 (e.g. 512×128), a script can re-layout the 2×2 image; in-game code can still use 2×2 or 1×4 as long as `background-size` and `background-position` match the actual layout.

### 7.2 Black background as transparent

- Some outputs use a solid black background. To avoid a black rectangle in the UI:
  - **Option A:** Offline: set alpha to 0 where RGB is (0,0,0); save PNG. No special CSS.
  - **Option B (recommended):** Keep the black PNG; use **`mix-blend-mode: lighten`** on the icon element. Black does not add light, so the background shows through; the sprite stays visible.

### 7.3 Using the sprite sheet in the game

- Use a **`<span>`** (or `<div>`) with **`background-image`** (not `<img src>`), so the frame is controlled by **`background-position`**.
- **2×2 layout:**
  - `background-size: 200% 200%` (one quadrant = one frame).
  - `background-position: (col*100)% (row*100)%` with `col = frameIndex % 2`, `row = Math.floor(frameIndex / 2)`.
- **Helper:** e.g. `spriteBackgroundPosition2x2(frameIndex)` returning `${col*100}% ${row*100}%`.
- **Toolbar:** Same sheet; fix position to one frame (e.g. full = last frame).
- **Board:** Per instance, set `background-position` from game state (e.g. `facilityUsage.remaining`). Store `dataset.facilityId` on the tile.
- **Per-tick updates:** Call an `update*Frames(boardEl, facilityUsage)` from the dynamic render path (e.g. `rerenderDynamic`) so icons update without re-rendering the whole board.

### 7.4 Checklist for a new multi-frame asset

1. Generate (ComfyUI or AutoSprite) and download the sprite.
2. Note **layout** (2×2, 1×4) and **frame count**.
3. If background is black, use alpha replacement or **`mix-blend-mode: lighten`**.
4. CSS: `background-size` and default `background-position` (e.g. 200% 200% for 2×2).
5. JS: map game state → `frameIndex`, set `background-position` with the same formula.
6. For state that changes every tick, add `update*Frames` and call it from the dynamic render path.

---

## 8. Limitations and Notes

- **ComfyUI:** `asset_id` and session are transient; after restart only published files remain. Server is local only.
- **AutoSprite:** Credits are consumed per call (preview, animate); spritesheet generation is free. Poll jobs every ≥30 s to avoid rate limits.
- **Tool schema:** Always read the MCP tool descriptors for exact parameters; this guide summarizes usage and project conventions.

---

## 9. References

- **IMAGE-ASSET-SPEC.md**: Pixel dimensions (64 or multiples), format (PNG), **2×2 layout** for 4-frame sheets from AutoSprite, and in-code usage.
- **ComfyUI MCP**: e.g. [joenorton/comfyui-mcp-server](https://github.com/joenorton/comfyui-mcp-server); run via project scripts if present.
- **AutoSprite**: [autosprite.io](https://www.autosprite.io), API at `https://www.autosprite.io/api/mcp`.
