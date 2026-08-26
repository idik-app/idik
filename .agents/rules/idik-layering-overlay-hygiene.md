# IDIK Layering and Overlay Hygiene

Use centralized z-index tokens from `lib/ui/layers.ts` for all overlays, modals, drawers, popovers, and fullscreen states.
Rule ini berlaku untuk modul lama maupun modul baru di `app/**` dan `components/**`.

- Do not introduce hardcoded high z-index classes like `z-[9999]` or `z-[10000]`.
- Prefer `UI_LAYERS` tokens (for example `modal`, `modalTop`, `dialogOverlayTop`, `popover`, `fullscreen`, `hud`).
- Keep layering intent clear: HUD/tooltip < modal/dialog < fullscreen.
- If a new layer is needed, add a named token in `lib/ui/layers.ts` first.

For modal backgrounds and blockers:

- Avoid stacking multiple `backdrop-blur-*` overlays in nested dialogs.
- Prefer solid dark overlays such as `bg-black/75` or `bg-black/80` for nested states.
- Only keep blur on one layer when truly needed for UX.

Before finalizing UI changes:

- Check for visual overlap regressions (tooltip above modal, floating badge over dialog, etc).
- Ensure dark mode readability remains high (`dark:text-white` for primary text, no dim critical labels).
- Validate hover, focus, disabled, and loading states remain visible in dark mode.
- Confirm responsive behavior on mobile and desktop keeps spacing and close actions accessible.

Quick guard checks for every UI change:

- Search for hardcoded extreme layers before finalizing (e.g. `z-[9999]`, `z-[10000]`).
- If found, replace with `UI_LAYERS` token in the same change.
