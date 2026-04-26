/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#f7f0e4",
        sand: "#ead5b7",
        ember: "#b55a1d",
        clove: "#7c3412",
        ink: "#1f130d",
        sage: "#435247",
        brass: "#d4a84d",
        admin: {
          base: "#101820",
          slate: "#1c2733",
          line: "#314153",
          text: "#e7eef6",
          mute: "#93a8bd",
          cyan: "#52c7ea",
          amber: "#f2b45a",
          rose: "#ef6c62",
          mint: "#7ed5a8",
        },
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        body: ["Manrope", "sans-serif"],
        admin: ["Space Grotesk", "sans-serif"],
      },
      boxShadow: {
        glow: "0 22px 70px rgba(181, 90, 29, 0.18)",
        panel: "0 26px 80px rgba(31, 19, 13, 0.12)",
        admin: "0 26px 70px rgba(8, 15, 22, 0.32)",
      },
      keyframes: {
        fadeSlide: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseRing: {
          "0%, 100%": { transform: "scale(1)", opacity: "0.9" },
          "50%": { transform: "scale(1.04)", opacity: "0.45" },
        },
        shimmer: {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "100% 50%" },
        },
      },
      animation: {
        fadeSlide: "fadeSlide 0.45s ease-out",
        pulseRing: "pulseRing 1.9s ease-in-out infinite",
        shimmer: "shimmer 5s linear infinite",
      },
    },
  },
  plugins: [],
};
