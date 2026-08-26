# IDIK Global Dark Mode Readability

When editing UI styles for this project, prioritize readability in dark mode:

- Use bright text for primary content: `dark:text-white`.
- Use near-white only for secondary/meta content: `dark:text-white/90` or `dark:text-white/85`.
- Ensure form placeholders remain readable in dark mode:
  - `dark:placeholder:text-white/90` for primary fields.
- Avoid overly dim dark-mode text for important UI copy (for example `dark:text-cyan-200/55`).
- For overlays/popups/calendars/modals, keep action labels and helper text high contrast.

If a visual choice conflicts with readability, choose readability first.
