/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Fraunces"', "serif"],
        mono: ['"JetBrains Mono"', "monospace"],
        sans: ['"Geist"', "system-ui", "sans-serif"],
      },
      colors: {
        ink: "#0a0a0a",
        paper: "#f5f1e8",
        accent: "#ff5722",
        muted: "#6b6b6b",
        line: "#1a1a1a",
      },
    },
  },
  plugins: [],
};
