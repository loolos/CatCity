# English-Only Language Policy

Status: Active  
Applies to: Entire repository

## Policy Statement

All implementation artifacts must be written in English.

This includes:

- Source code identifiers where reasonable (variables, functions, classes, file names)
- Code comments
- Documentation (design docs, technical plans, README, ADRs, guides)
- In-game UI text (menus, buttons, labels, tooltips, HUD text, result screens, and default player-facing copy)
- Test descriptions and test case names
- Commit messages and pull request descriptions whenever possible

## Scope and Exceptions

- The default shipped interface for the MVP must be English.
- User-facing localization content may support multiple languages in the future, but default source files should remain English.
- Proper nouns, product names, and unavoidable external terms may remain as-is.

## Rationale

- Maintain consistency across engineering artifacts
- Improve collaboration with international contributors
- Reduce ambiguity in maintenance and future expansion

## Enforcement

Before merging changes, contributors should verify:

1. New code comments are in English.
2. New/updated docs are in English.
3. New test names and test narratives are in English.
4. New in-game UI strings are in English (unless explicitly part of a localization test).

If non-English content is introduced accidentally, it should be revised before merge.
