// app/config/theme.ts
export const IDIKTheme = {
  name: "IDIK Cathlab Command Mode",
  mode: {
    light: {
      background: "#FFFFFF",
      foreground: "#0A0F17",
      border: "#E4E7EB",
      text: "#0B121A",
      primary: "#00E0FF", // cyan
      secondary: "#D4AF37", // gold
      accentCyan: "rgba(0, 224, 255, 0.3)",
      accentGold: "rgba(212, 175, 55, 0.4)",
      glowCyan: "0 0 12px rgba(0,224,255,0.5)",
      glowGold: "0 0 12px rgba(212,175,55,0.4)",
    },
    dark: {
      background: "#0A0F17",
      foreground: "#E9F1F9",
      border: "#1C2834",
      text: "#C8E8FF",
      primary: "#00E0FF",
      secondary: "#D4AF37",
      accentCyan: "rgba(0,224,255,0.2)",
      accentGold: "rgba(212,175,55,0.25)",
      glowCyan: "0 0 18px rgba(0,224,255,0.4)",
      glowGold: "0 0 18px rgba(212,175,55,0.3)",
    },
  },

  /* Animasi standar */
  animation: {
    fast: { duration: 0.3, ease: "easeOut" },
    medium: { duration: 0.6, ease: "easeInOut" },
    slow: { duration: 1.2, ease: "easeInOut" },
    pulse: { duration: 6, repeat: Infinity, ease: "easeInOut" },
  },

  /* Shadow dan gradient preset */
  shadow: {
    cyan: "0 0 15px rgba(0,224,255,0.25)",
    gold: "0 0 15px rgba(212,175,55,0.3)",
    hybrid: `
      0 0 8px rgba(0,224,255,0.2),
      0 0 16px rgba(212,175,55,0.25)
    `,
  },

  gradient: {
    cyanLine:
      "linear-gradient(90deg, rgba(0,224,255,0.2), rgba(0,224,255,0.6), rgba(0,224,255,0.2))",
    goldLine:
      "linear-gradient(90deg, rgba(212,175,55,0.25), rgba(212,175,55,0.6), rgba(212,175,55,0.25))",
    hybridBG:
      "linear-gradient(135deg, rgba(212,175,55,0.1) 0%, rgba(0,224,255,0.05) 100%)",
  },
} as const;

export type IDIKThemeType = typeof IDIKTheme;
