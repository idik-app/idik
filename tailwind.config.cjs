/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],

  safelist: [
    "drop-shadow-[0_0_6px_#00ffff]",
    "drop-shadow-[0_0_6px_#f4b400]",
    "drop-shadow-[0_0_6px_#ff4b4b]",
  ],

  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        border: "hsl(var(--border))",
        ring: "hsl(var(--ring))",
        card: "hsl(var(--card))",
        gold: "hsl(var(--gold))",
        cyan: "hsl(var(--cyan))",
      },
      borderColor: { DEFAULT: "hsl(var(--border))" },
      boxShadow: { "jarvis-glow": "0 0 15px hsl(var(--cyan) / 0.5)" },
      keyframes: {
        "jarvis-pulse": {
          "0%, 100%": {
            opacity: "1",
            boxShadow: "0 0 10px hsl(var(--cyan) / 0.4)",
          },
          "50%": {
            opacity: "0.8",
            boxShadow: "0 0 20px hsl(var(--gold) / 0.6)",
          },
        },
      },
      animation: { "jarvis-pulse": "jarvis-pulse 3s ease-in-out infinite" },
    },
  },

  plugins: [],
};
