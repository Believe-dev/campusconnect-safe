/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        flora: {
          bgFrom: "#eef1e7", // top of the screen gradient (warm cream)
          bgTo: "#e2e8dc", // bottom of the screen gradient (sage)
          ink: "#1c211d", // near-black text / buttons
          leaf: "#5f9a3f", // primary green accent
          leafBright: "#8ed957", // bright ring/progress green
          tagBg: "#dcefc7", // light green pill background
          tagText: "#3f6b2a", // dark green pill text
          card: "#ffffff",
          muted: "#6b7568",
          chip: "#f2f4ee",
        },
      },
      fontFamily: {
        sans: ["Inter", "Helvetica Neue", "Arial", "sans-serif"],
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      boxShadow: {
        floating: "0 10px 30px -10px rgba(28, 33, 29, 0.25)",
        card: "0 8px 24px -8px rgba(28, 33, 29, 0.18)",
      },
      keyframes: {
        "ring-in": {
          "0%": { strokeDashoffset: "var(--ring-circumference)" },
          "100%": { strokeDashoffset: "var(--ring-offset)" },
        },
        "rise-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "ring-in": "ring-in 1s ease-out forwards",
        "rise-in": "rise-in 0.4s ease-out forwards",
      },
    },
  },
  plugins: [],
};
