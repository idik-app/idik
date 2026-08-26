---
name: cursor-rules-sync
description: >-
  Duplicate and sync Cursor rules (.cursor/rules/*.mdc or .cursorrules) into
  Antigravity rules (.agents/rules/*.md) and skills (.agents/skills/).
  Use this skill whenever the user asks to copy, import, or duplicate Cursor rules into Antigravity.
---

# Cursor Rules Sync for Antigravity

This skill defines how Antigravity reads Cursor configuration files and duplicates them into native Antigravity Customizations.

## Rule Mapping Matrix

Cursor Location | Antigravity Equivalent Location | Notes
--- | --- | ---
`.cursor/rules/*.mdc` | `.agents/rules/*.md` | Strip/convert MDC frontmatter into standard Markdown rule files
`.cursorrules` | `.agents/rules/cursorrules.md` or `AGENTS.md` | General workspace rules
`.cursor/skills/` | `.agents/skills/<name>/SKILL.md` | Workspace progressive skills

## Synchronizing Procedure

1. **Scan Cursor Directory**:
   - Check `.cursor/rules/` for `.mdc` files.
   - Check workspace root for `.cursorrules`.

2. **Convert & Transfer**:
   - Copy contents to `.agents/rules/<rule-name>.md`.
   - Preserve guidelines, code snippets, and design standards.

3. **Verify**:
   - Confirm `.agents/rules/` contains the updated Markdown files.
