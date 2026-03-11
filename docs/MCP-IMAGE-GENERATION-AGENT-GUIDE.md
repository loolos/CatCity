# MCP Image Generation – Agent Guide

This document describes how to generate image assets in this project using the ComfyUI MCP server. **Agents should read this before calling image-generation tools.**

**Image dimensions, format, and sprite-sheet layout** are defined in **IMAGE-ASSET-SPEC.md**. When generating images (single or sprite sheets), follow that spec: **64×64 or multiples of 64** for all dimensions, **PNG** preferred, and use the documented layout and splitting rules for animations.

---

## 1. Overview

- **MCP server**: `comfyui` (ComfyUI MCP Server).
- **Purpose**: Generate images (and optionally audio/video) via tool calls. ComfyUI runs locally; the MCP server bridges the agent to it.
- **Config**: Project MCP config is in `.cursor/mcp.json`. The server is connected via **streamable-http** at `http://127.0.0.1:9000/mcp`.

---

## 2. Prerequisites (Human / Environment)

Before an agent can successfully generate images:

1. **ComfyUI** must be running locally (default port **8188**).
2. **ComfyUI MCP Server** must be running (e.g. via `scripts/run-comfyui-mcp.ps1` or `scripts/run-comfyui-mcp.bat`). It listens at `http://127.0.0.1:9000/mcp`.
3. ComfyUI must have at least one usable checkpoint model (e.g. under `models/checkpoints/` in the ComfyUI install).

If the MCP server or ComfyUI is not running, image-generation tool calls will fail. The agent cannot start these processes; the user must have started them.

---

## 3. Main Tools for Image Generation

Agents should use the following MCP tools when generating image assets.

### 3.1 `generate_image`

- **Use for**: Creating a new image from a text prompt.
- **Required parameter**: `prompt` (string).
- **Optional parameters** (examples): `width`, `height`, `steps`, `cfg`, `model`, etc. If not provided, server defaults apply.
- **Returns**: Asset info including `asset_id`, which can be used for `regenerate`, `view_image`, or `publish_asset`.

**Size and format (see IMAGE-ASSET-SPEC.md):**  
- Request **width** and **height** as **64×64 or multiples of 64** (e.g. 64, 128, 256). Use `set_defaults` or pass explicit `width`/`height` so outputs match the project spec.  
- Prefer **PNG** for sprites and anything needing transparency.

**Example (conceptual):**  
Call `generate_image` with `prompt` describing the desired image (e.g. style, subject, layout). Use clear, descriptive English prompts for best results.

### 3.2 `view_image`

- **Use for**: Viewing a generated image (e.g. to verify quality or describe it to the user).
- **Required**: `asset_id` from a previous generation (or from `list_assets`).
- **Note**: Only supports image assets (e.g. PNG, JPEG, WebP, GIF), not audio/video.

### 3.3 `regenerate`

- **Use for**: Creating a new image from an existing asset with optional parameter overrides (e.g. different prompt, steps, size).
- **Required**: `asset_id` from a previous generation.
- **Optional**: Override any generation parameters. Useful for iterative refinement without re-specifying everything.

### 3.4 `list_assets`

- **Use for**: Listing recently generated assets (e.g. to find `asset_id` for follow-up actions).
- Helps the agent keep context when the user asks to “change that image” or “publish the last one”.

### 3.5 `publish_asset`

- **Use for**: Writing a generated asset into the project’s web-visible directory with optional filename and manifest.
- **Typical use**: Save the final image into something like `assets/` or `public/` so the app or docs can reference it.
- **Parameters**: Include `asset_id`; optionally `target_filename`, `manifest_key`, etc. See MCP server docs for exact schema.
- **Note**: Asset IDs are session-scoped; after the MCP server restarts, previous `asset_id`s are invalid.

### 3.6 Configuration and Discovery

- **`list_models`**: List available ComfyUI models (useful to suggest or choose a model).
- **`get_defaults`** / **`set_defaults`**: Get or set default generation parameters (size, steps, etc.) so agents can rely on consistent defaults.
- **`get_job`** / **`get_queue_status`** / **`cancel_job`**: Check or cancel long-running jobs when needed.

---

## 4. Project Conventions for Image Assets

- **Storage**: Prefer saving final assets under the project’s **`assets/`** directory (e.g. `assets/<name>.png`). Use `publish_asset` when the MCP server supports it and the project has a configured publish path; otherwise the agent may need to direct the user to save from ComfyUI output or document where the file was written.
- **Naming**: Use clear, lowercase, hyphenated names (e.g. `cat-walk-spritesheet.png`, `hero-banner.png`).
- **Dimensions and format**: All images must be **64×64 or multiples of 64** in width and height, and **PNG** is preferred. See **IMAGE-ASSET-SPEC.md** for the full spec.
- **Sprite sheets**: If the user asks for a sprite sheet (e.g. character animation frames):
  - Generate at a **total size that matches the spec**: each frame **64×64 or a multiple** (e.g. 4 frames in one row → 256×64; 4×2 grid → 256×128). Specify in the prompt: “each frame 64×64 pixels”, “4 frames in a single row”, “total image 256×64”, “no gaps between frames”, “PNG”.
  - Save to `assets/` and, if applicable, provide or update a demo HTML that **splits the sheet by the same rule**: row-major order, frame index `i` → column `i % cols`, row `floor(i / cols)`, with frame size = sheet width÷cols × sheet height÷rows. See **IMAGE-ASSET-SPEC.md** for layout tables and splitting math.

---

## 5. Workflow Summary for Agents

1. **Check availability**: If a tool call fails with connection or server errors, assume ComfyUI or the MCP server is not running. Inform the user that they need to start ComfyUI and the MCP server (see Prerequisites).
2. **Generate**: Call `generate_image` with a clear `prompt`. Optionally use `get_defaults` or `list_models` first.
3. **Inspect**: Use `view_image` with the returned `asset_id` if the agent or user needs to verify the result.
4. **Iterate**: Use `regenerate` with the same `asset_id` and parameter overrides if the user wants changes.
5. **Persist**: Use `publish_asset` to write the final image into the project (e.g. `assets/`), or document where the file is so the user can copy it into the project.
6. **Reference in project**: When adding or updating code or docs that use the image, reference the path under `assets/` (e.g. `assets/cat-walk-spritesheet.png`) and keep paths relative to the project root where appropriate.

---

## 6. Limitations and Notes

- **Session scope**: `asset_id` values are valid only for the current MCP server session. After a restart, previously generated assets are no longer addressable by those IDs; only files already published or saved to disk remain.
- **Local only**: The MCP server and ComfyUI are expected to run on the same machine as the agent (e.g. `http://127.0.0.1:9000/mcp`). Do not assume a remote ComfyUI URL unless documented.
- **Tool schema**: Agents should read the actual MCP tool descriptors (e.g. parameter names and types) before calling tools; this guide summarizes usage and project conventions, not the exact API contract.

---

## 7. References

- **IMAGE-ASSET-SPEC.md**: Pixel dimensions (64×64 or multiples), file format (PNG preferred), and sprite-sheet layout and splitting for animation.
- ComfyUI MCP Server (this project): typically installed at `C:\Users\<user>\OneDrive\Documents\Project\comfyui-mcp-server`; run via `scripts/run-comfyui-mcp.ps1` or `scripts/run-comfyui-mcp.bat` in this repo.
- Upstream: [joenorton/comfyui-mcp-server](https://github.com/joenorton/comfyui-mcp-server) for full tool list, parameters, and publish/config details.

---

## 8. End-to-end workflow: MCP generation to in-game use

This section documents a repeatable workflow from generating a sprite sheet via MCP to using it in the game, including **pixel/layout handling** and **black-background-as-transparent** in the UI. Use it as a template for similar assets (e.g. multi-state facility icons).

### 8.1 MCP options

- **ComfyUI** (this guide §§ 1–6): Local, prompt-based image generation; good for custom dimensions and styles. Use `generate_image` with width/height (e.g. 64×64 multiples).
- **AutoSprite** (optional): Cloud MCP at `https://www.autosprite.io/api/mcp`; good for prop/character sprites and animation strips. Configure in `.cursor/mcp.json` with `type: "http"`, `url`, and `Authorization: Bearer <API_KEY>`. Server name in Cursor may be e.g. `project-0-CatCity-autosprite`.

### 8.2 Example: Fish-bowl sprite (AutoSprite)

1. **Check credits**: `get_account` (no args).
2. **Preview asset**: `generate_asset_preview` with `category: "prop"`, `description` (e.g. round blue glass fish bowl, water, orange fish), `style: "flat"`. Returns 4 image URLs (costs 1 credit).
3. **Create asset**: `create_asset` with `name`, `imageUrl` (one of the preview URLs), optional `description`. Free.
4. **Animate for states**: `animate_asset` with `assetId`, `animationPrompt` (e.g. “Four states: empty bowl, then few fish, then half full, then full of fish. 2D flat.”, max 200 chars), optional `isLooping: false`, `quality: "standard"`. Returns `jobId` (costs 5 credits).
5. **Poll job**: `get_asset_job_status` with `jobId`. Wait at least 30 s before first check, then 30 s between checks. When `status === "succeeded"`, you get `videoUrl`, `spritesheetUrl`, `atlasUrl`.
6. **Custom spritesheet**: `generate_asset_spritesheet` with `assetId`, `frameSize` (e.g. 128), `maxFrames` (e.g. 4), `removeBg` (e.g. `"default"`). Free; returns a new `jobId`. Poll with `get_asset_job_status` again until done, then use the returned `spritesheetUrl`.
7. **Download**: Save the image from `spritesheetUrl` into the project (e.g. `public/assets/sprites/facilities/<name>-sheet.png`).

### 8.3 Pixel and layout: 2×2 vs 1×4

- **AutoSprite behaviour**: For 4 frames, the API often returns a **2×2 grid** (two rows, two columns), not a 1×4 horizontal strip. The game must interpret the sheet as 2×2.
- **Frame index → cell**: Row-major order: frame 0 = top-left, 1 = top-right, 2 = bottom-left, 3 = bottom-right. So:
  - `col = frameIndex % 2`
  - `row = Math.floor(frameIndex / 2)`
- **Optional post-processing**: If you need a 1×4 strip (e.g. 512×128), use a script to re-layout: load the 2×2 image, extract four tiles (e.g. (0,0), (1,0), (0,1), (1,1)), composite them in a single row, then save. The in-game code can still treat either 2×2 or 1×4; the important part is consistent `background-size` and `background-position` (see § 8.5).

### 8.4 Black background and “transparent” in-game

- **Why black**: Some MCP outputs (or post-processing) use a solid black background. To avoid a visible black rectangle in the UI, treat black as transparent in the game.
- **Option A – Replace black with alpha (offline)**: In a build step or script, open the PNG and set alpha to 0 where RGB is (0,0,0) (or near-black). Save as PNG with transparency. No special CSS needed.
- **Option B – Blend in-game (recommended for black sheets)**: Keep the black-background PNG and use **`mix-blend-mode: lighten`** on the icon element. With lighten, black (0,0,0) does not add light, so the underlying tile/background shows through; non-black pixels (the sprite) remain visible. No asset change required.
- **CSS**: e.g. `.facility-icon-fish-bowl { mix-blend-mode: lighten; }` (plus the sprite background styles below).

### 8.5 Using the sprite sheet in the game

- **Element**: Use a `<span>` (or `<div>`) with `background-image` pointing to the sheet PNG, not an `<img>` with `src`, so you can control which frame is visible via `background-position`.
- **2×2 layout** (one frame = one quadrant):
  - `background-size: 200% 200%` so the full image is 2× the element in each axis; one quadrant fills the element.
  - `background-position: <x> <y>` where `x = (frameIndex % 2) * 100%`, `y = Math.floor(frameIndex / 2) * 100%`:
    - Frame 0: `0% 0%`
    - Frame 1: `100% 0%`
    - Frame 2: `0% 100%`
    - Frame 3: `100% 100%`
- **Helper in code** (e.g. `src/ui.js`):
  ```js
  function fishBowlBackgroundPosition2x2(frameIndex) {
    const col = frameIndex % 2;
    const row = Math.floor(frameIndex / 2);
    return `${col * 100}% ${row * 100}%`;
  }
  ```
- **Toolbar**: For the tool button, use the same class and sheet; default `background-position: 0 0` shows frame 0.
- **Board**: For each facility instance, set `background-position` from the current state (e.g. `facilityUsage.remaining`). Store `dataset.facilityId` on the tile so you can update by id.
- **Per-tick updates**: When the simulation ticks, update only the fish-bowl icons (not the whole board): e.g. `updateFishBowlFrames(boardEl, facilityUsage)` that loops over `boardEl.querySelectorAll('.tile[data-facility-id]')`, reads `facilityUsage.get(tile.dataset.facilityId)`, maps `remaining` to `frameIndex`, and sets `icon.style.backgroundPosition = fishBowlBackgroundPosition2x2(frameIndex)`. Call this from the same place that runs `renderCats` / HUD updates (e.g. `rerenderDynamic` in the game controller).

### 8.6 Checklist for a new multi-frame asset

1. Generate (ComfyUI or AutoSprite) and download the sprite image.
2. Note the **layout** (2×2, 1×4, etc.) and **frame count**.
3. If background is black and you want it transparent in-game, either flatten to alpha in a script or use **`mix-blend-mode: lighten`** on the icon element.
4. In CSS: `background-size` and default `background-position` so one frame fills the element (e.g. 200% 200% for 2×2).
5. In JS: map game state → `frameIndex`, set `background-position` using the same formula (e.g. 2×2: `col = frameIndex % 2`, `row = Math.floor(frameIndex / 2)`).
6. For state that changes every tick, add an `update*Frames`-style function and call it from the dynamic render path so the icon updates without re-rendering the whole board.
