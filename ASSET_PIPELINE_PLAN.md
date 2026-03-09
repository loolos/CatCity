# Cat City Asset Pipeline Plan (MVP)

Version: 0.1  
Status: Pre-implementation clarification  
Scope: Static frontend MVP visual assets (no backend dependency)

## 1. Goals

Define how visual game elements are produced and integrated before implementation starts.

MVP visual targets:

- Cats
- Facilities (Fish Bowl, Cat Bed, Laser Pointer, Cardboard Tunnel)
- Grid map tiles and overlays
- Basic feedback effects (selection, hover, busy/idle indicators)

Constraints:

- English-first repository policy
- Static web delivery
- Fast iteration and easy replacement later

---

## 2. Recommended Asset Strategy for MVP

Use a **hybrid approach**:

1. **Programmatic visuals for board primitives**
   - Grid tiles
   - Selection highlights
   - Direction arrows
   - Tunnel link markers
2. **Small sprite set for semantic entities**
   - Cat sprite(s)
   - Facility icons

This keeps MVP lightweight while preserving clear readability.

---

## 3. Format and Technical Choices

### 3.1 Preferred file formats

- **SVG** for facilities and UI icons
  - Crisp at all resolutions
  - Easy to color-theme
  - Small file size for static hosting
- **PNG or SVG** for cats
  - Start with 1–2 simple styles
  - Optional later animation frames

### 3.2 Directory layout

```text
public/assets/
  sprites/
    cats/
      cat-default.svg
      cat-alt.svg
    facilities/
      fish-bowl.svg
      cat-bed.svg
      laser-pointer.svg
      tunnel.svg
  ui/
    arrow-up.svg
    arrow-right.svg
    arrow-down.svg
    arrow-left.svg
```

### 3.3 Loading approach

- Use static imports (Vite asset handling)
- Cache through browser naturally
- No runtime asset generation service

---

## 4. How to Generate the Art Assets

## 4.1 MVP baseline (fastest path)

- Draw minimal vector assets directly in Figma/Illustrator/Inkscape.
- Export to SVG with consistent viewport (e.g., 64x64).
- Normalize naming and anchor center alignment for predictable placement.

## 4.2 Optional AI-assisted pipeline (allowed but controlled)

If using AI-generated source images:

1. Generate concept drafts externally.
2. Manually clean and simplify to final SVG/PNG.
3. Ensure style consistency (stroke width, palette, silhouette).
4. Verify license and ownership are project-safe before commit.

Do not rely on runtime AI generation in MVP.

---

## 5. Visual Style Guide (MVP)

- Perspective: top-down or near-top-down only
- Style: flat/minimal, high-contrast, readable at small sizes
- Palette: 1 neutral board palette + facility-specific accent colors
- Tile readability priority over decorative detail

Suggested facility color coding:

- Fish Bowl: blue/cyan
- Cat Bed: purple/violet
- Laser Pointer: red/orange
- Tunnel: yellow/brown

---

## 6. Map Rendering Composition

Per tile render order:

1. Base tile background
2. Facility sprite (if present)
3. Directional overlay (laser arrow)
4. Cat sprite(s)
5. State overlays (selected, busy, path hint)

This ordering ensures gameplay readability and interaction clarity.

---

## 7. Cat Motion Visual Plan

Logic is turn-based, but display is interpolated:

- Cat has `prevTilePos` and `tilePos`
- Per-frame position is lerped between those positions
- Use CSS transform translate for smooth movement

No skeletal animation is required for MVP.

Optional later improvements:

- two-frame idle bounce
- facing-direction sprite flip
- tiny trail on fast simulation speed

---

## 8. Asset QA Checklist Before Coding

1. Every sprite is readable at 32px and 48px.
2. Facility silhouettes remain distinguishable in grayscale.
3. Laser direction arrow is unambiguous.
4. Tunnel pair marker is visually clear.
5. Cat remains visible above all facilities.
6. All filenames and labels are English.

---

## 9. Future Expansion Compatibility

Keep an abstraction layer for entity visuals:

- facility type -> sprite reference
- cat type/personality -> sprite variant
- theme token -> color token map

This enables later skin/theme swaps and localization-friendly UI icon sets.
