# IDIK App - Antigravity Agent Guidelines

This project uses Antigravity Agent Customizations mapped directly from Cursor `.cursor/rules`.

## Project Rules Summary

### 1. Global Dark Mode Readability
- Use `dark:text-white` for primary content.
- Use `dark:text-white/90` or `dark:text-white/85` for secondary text.
- Ensure form placeholders remain readable (`dark:placeholder:text-white/90`).
- Avoid dim text such as `dark:text-cyan-200/55`.

### 2. Dark Mode Text Standards (Tindakan Dashboard)
- Standardize bright dark-mode text and visible placeholders across `app/dashboard/layanan/tindakan/components/**/*`.
- Ensure date pickers, calendar overlays, and action buttons (`Hapus tanggal`) are clear in dark mode.

### 3. Layering & Overlay Hygiene
- Use centralized `z-index` tokens from `lib/ui/layers.ts` (`UI_LAYERS`).
- Do NOT introduce hardcoded extreme z-index classes like `z-[9999]` or `z-[10000]`.
- Avoid stacking multiple `backdrop-blur-*` overlays in nested dialogs.
