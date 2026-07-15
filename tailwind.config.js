/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./views/**/*.html", "./public/**/*.html"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef7f0",
          100: "#d3ecda",
          500: "#1d9e75",
          600: "#0f6e56",
          700: "#085041"
        }
      }
    },
  },
  plugins: [],
}
