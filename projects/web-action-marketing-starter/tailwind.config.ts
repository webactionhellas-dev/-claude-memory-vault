import type { Config } from "tailwindcss";

/**
 * "Aegean Whitewash" — the Aegean House design system.
 * Whitewashed white, soft Cycladic sky-blue, deep sea navy, professional and airy.
 * Brand fonts: PP Hatton (display) + Averta (body), self-hosted from the client site.
 */
const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: "1.5rem", lg: "2.5rem" },
      screens: { "2xl": "1360px" },
    },
    extend: {
      colors: {
        white: "#FFFFFF",
        // whitewashed off-whites, each with a breath of blue
        whisper: "#F8FBFD",
        mist: "#EEF5FB",
        haze: "#E1EBF3", // hairlines / dividers
        porcelain: "#F2F7FC",
        // soft, airy Cycladic blues — the "white mixed with blue" family (lightened)
        sky: {
          soft: "#E5EFF8",
          DEFAULT: "#BAD4EA",
          deep: "#8FB4D6",
        },
        // primary accent — a light, airy Aegean blue; the deep shade keeps text legible
        azure: {
          soft: "#A6CAE7",
          DEFAULT: "#6699C7",
          deep: "#3A6C9E",
        },
        // deep sea — the anchoring footer / dark sections
        aegean: {
          DEFAULT: "#1B4266",
          900: "#123048",
        },
        ink: "#1B3145", // primary text (softened slate navy)
        slate: "#617889", // muted text
      },
      fontFamily: {
        // Greek fallbacks after the brand fonts: Latin glyphs render in
        // Hatton/Averta, Greek glyphs fall through to GFS Didot / Inter.
        display: ["var(--font-hatton)", "var(--font-greek-display)", "Georgia", "serif"],
        sans: ["var(--font-averta)", "var(--font-greek-body)", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        luxe: "0.26em",
        wide2: "0.16em",
      },
      maxWidth: {
        content: "1360px",
      },
      boxShadow: {
        lift: "0 30px 70px -32px rgba(27, 66, 102, 0.26)",
        soft: "0 18px 50px -24px rgba(27, 66, 102, 0.20)",
        azure: "0 14px 36px -14px rgba(82, 137, 190, 0.5)",
      },
      backgroundImage: {
        "sky-line":
          "linear-gradient(90deg, transparent, #5289BE 50%, transparent)",
        // The hero veil is no longer a CSS gradient — it bands. It is now a
        // pre-rendered, dithered PNG (.hero-veil-img, built by gen-hero-veil.mjs).
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "rise-particle": {
          "0%": { transform: "translateY(0) scale(1)", opacity: "0" },
          "10%": { opacity: "0.7" },
          "100%": { transform: "translateY(-120vh) scale(0.4)", opacity: "0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.9s cubic-bezier(0.16,1,0.3,1) both",
        float: "float 7s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
