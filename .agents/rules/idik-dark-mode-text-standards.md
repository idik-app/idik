# IDIK Dark Mode Text Standards

Use these conventions for dark mode readability in tindakan dashboard components (`app/dashboard/layanan/tindakan/components/**/*.{ts,tsx}`).

- Prefer bright text in dark mode: use `dark:text-white` (or `dark:text-white/90` only when secondary).
- Avoid dim cyan text for primary labels/content (for example `dark:text-cyan-200/55`).
- Ensure placeholders in dark mode are visible: use `dark:placeholder:text-white/90` (or `dark:placeholder:text-white`).
- For date/filter controls, align placeholder and control text with the same bright dark-mode tone.
- For calendar overlays (`react-day-picker`), force readable dark-mode styles for caption, weekday, day button, selected/today states, and footer actions.
- For action text like `Hapus tanggal`, use high-contrast foreground in dark mode and a subtle hover background so the label is always visible.

Quick examples:

```tsx
// Input dark placeholder
className="... dark:text-white dark:placeholder:text-white/90"

// Secondary helper text
className="... dark:text-white/85"
```
