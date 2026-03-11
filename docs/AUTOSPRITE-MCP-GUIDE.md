# AutoSprite MCP Guide

AutoSprite provides AI spritesheet generation via MCP. Configuration lives in `.cursor/mcp.json`. After reloading MCP, agents can call the tools below.

## Ensuring connection

- In Cursor, run **Reload MCP** or restart Cursor so the AutoSprite server (e.g. `project-0-CatCity-autosprite`) appears in the MCP list.
- If it does not appear, check that the API key is valid and that `https://www.autosprite.io/api/mcp` is reachable.

## Available tools (19)

### Account

| Tool | Description |
|------|-------------|
| `get_account` | Check credit balance (call before generating). |

### Characters

| Tool | Description |
|------|-------------|
| `create_character` | Create a new character from a text description. |
| `get_character` | Get details for a character, including spritesheets. |
| `list_characters` | List your characters with pagination and search. |

### Spritesheets

| Tool | Description |
|------|-------------|
| `generate_spritesheet` | Generate animations and export a spritesheet (returns usage info). |
| `regenerate_spritesheet` | Regenerate spritesheets at different sizes from existing video (free). |
| `get_spritesheet` | Get a spritesheet and its download URL. |
| `list_spritesheets` | List spritesheets for a character. |

### Jobs

| Tool | Description |
|------|-------------|
| `get_job_status` | Check spritesheet export job status. |
| `list_jobs` | List export jobs (use jobId for status checks). |

### Assets (props / static objects)

| Tool | Description |
|------|-------------|
| `create_asset` | Save an asset from an image URL. |
| `get_asset` | Get details for an asset. |
| `list_assets` | List your assets. |
| `generate_asset_preview` | Generate preview images for an asset (category, description, style). |
| `generate_asset_3d_model` | Generate a 3D model from an asset image. |
| `animate_asset` | Generate an animation video from an asset. |
| `generate_asset_spritesheet` | Generate a spritesheet from an asset’s animation (frameSize, maxFrames, removeBg). |
| `get_asset_spritesheet` | Get spritesheet info and download URL for an asset. |
| `get_asset_job_status` | Check status of an asset animation or spritesheet job. |

## Recommended workflow (spritesheet in this project)

1. **Check balance**: Call `get_account` to confirm credits.
2. **Create character or asset**:
   - **Character animations**: `create_character` (text description) → then `generate_spritesheet` with animation types (idle, walk, run, jump, attack, etc.).
   - **Static props** (e.g. fish bowl): `generate_asset_preview` (category, description, style) → `create_asset` (name, imageUrl) → `animate_asset` (animationPrompt) → poll `get_asset_job_status` → `generate_asset_spritesheet` (frameSize, maxFrames, removeBg) → poll again → download from `spritesheetUrl`.
3. **Poll jobs**: Exports are async; use `get_job_status` or `get_asset_job_status` with the returned `jobId`. Wait at least 30 seconds between checks.
4. **Save file**: Download from the returned URL and save under `public/assets/sprites/` (e.g. `facilities/<name>-sheet.png`).

## Example prompts (for agents)

- “Use AutoSprite to check my account balance.”
- “Use AutoSprite to create a 2D cat character and generate idle and walk spritesheets.”
- “Use AutoSprite to generate an asset spritesheet for a blue round fish bowl with orange fish and save it to the project’s facilities folder.”

Export formats support Unity, Godot, GameMaker, Phaser, RPG Maker, and others; specify when generating or exporting.

For the full pipeline (pixel layout, black-background-as-transparent, in-game usage), see **MCP-IMAGE-GENERATION-AGENT-GUIDE.md** § 8.
