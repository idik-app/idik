import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
  ],

  theme: {
    extend: {
      /* 🎨 Warna sesuai variabel HSL di globals.css */
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",

        gold: "hsl(var(--gold))",
        cyan: "hsl(var(--cyan))",
        accent: "hsl(var(--accent))",

        border: "hsl(var(--border))",
        ring: "hsl(var(--ring))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
      },

      /* 🔲 Border Radius Global */
      borderRadius: {
        xl: "1rem",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },

      /* 💫 Animations dari globals.css */
      keyframes: {
        "pulse-glow": {
          "0%,100%": {
            boxShadow: "0 0 20px hsl(var(--cyan) / 0.2)",
            borderColor: "hsl(var(--cyan))",
          },
          "50%": {
            boxShadow: "0 0 40px hsl(var(--gold) / 0.5)",
            borderColor: "hsl(var(--gold))",
          },
        },
        "float-holo": {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
        "pulse-ring": {
          "0%,100%": { boxShadow: "0 0 10px hsl(var(--ring)/0.3)" },
          "50%": { boxShadow: "0 0 25px hsl(var(--ring)/0.8)" },
        },
        "slide-glow": {
          from: { backgroundPositionX: "0%" },
          to: { backgroundPositionX: "200%" },
        },
        "hologram-scan": {
          "0%": { backgroundPosition: "0% 0%", opacity: "0.3" },
          "50%": { backgroundPosition: "100% 100%", opacity: "0.6" },
          "100%": { backgroundPosition: "0% 0%", opacity: "0.3" },
        },
      },

      animation: {
        "pulse-glow": "pulse-glow 2.5s ease-in-out infinite",
        "float-holo": "float-holo 4s ease-in-out infinite",
        "pulse-ring": "pulse-ring 3s ease-in-out infinite",
        "slide-glow": "slide-glow 6s linear infinite",
        "hologram-scan": "hologram-scan 4s linear infinite",
      },

      /* 💠 Shadow Preset khas JARVIS */
      boxShadow: {
        jarvis: "0 0 20px hsl(var(--cyan) / 0.3)",
        glow: "0 0 40px hsl(var(--gold) / 0.4)",
      },

      /* ✨ Transition Default */
      transitionTimingFunction: {
        "jarvis-smooth": "cubic-bezier(0.45, 0, 0.55, 1)",
      },
      safelist: [
        "bg-[linear-gradient(90deg,transparent,rgba(0,255,255,0.8),transparent)]",
      ],
    },
  },

  plugins: [tailwindcssAnimate],
};

export default config;
