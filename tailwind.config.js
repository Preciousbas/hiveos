/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./lib/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        hive: {
          bg: "#0d0e0a",
          panel: "#161812",
          panel2: "#1f2218",
          border: "#34382a",
          borderHot: "#5c5634",
          text: "#f1eee3",
          muted: "#9c9888",
          accent: "#D4AF37",
          accent2: "#BDB76B",
          ink: "#1a1608",
          warn: "#D4A017",
          danger: "#C96A4A",
          ok: "#9BB86A",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 40px rgba(212, 175, 55, 0.16)",
      },
      keyframes: {
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
      },
      animation: {
        pulseSoft: "pulseSoft 1.8s ease-in-out infinite",
        scan: "scan 2.4s linear infinite",
      },
    },
  },
  plugins: [],
};
