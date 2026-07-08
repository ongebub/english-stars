import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sky: {
          DEFAULT: "#4FC3F7",
          dark: "#0288D1",
        },
        leaf: {
          DEFAULT: "#66BB6A",
          dark: "#388E3C",
        },
        coral: {
          DEFAULT: "#FF8A65",
          dark: "#E64A19",
        },
        sun: {
          DEFAULT: "#FFD54F",
          dark: "#F9A825",
        },
        purple: {
          DEFAULT: "#CE93D8",
          dark: "#7B1FA2",
        },
        cream: "#FFF8E1",
        "text-dark": "#1A237E",
        "text-mid": "#455A64",
        "text-light": "#90A4AE",
      },
      fontFamily: {
        nunito: ["var(--font-nunito)", "Nunito", "sans-serif"],
        sarabun: ["var(--font-sarabun)", "Sarabun", "sans-serif"],
        fredoka: ["var(--font-fredoka)", "Fredoka", "cursive", "sans-serif"],
      },
      borderRadius: {
        xl: "20px",
        "2xl": "24px",
        "3xl": "32px",
      },
    },
  },
  plugins: [],
};
export default config;
