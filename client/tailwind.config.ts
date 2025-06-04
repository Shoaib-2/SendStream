import type { Config } from "tailwindcss";

export default {  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",  // This will cover all files in src
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",  // App router pages
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",  // Components
    "./src/context/**/*.{js,ts,jsx,tsx,mdx}",  // Context providers
  ],
  theme: {
    extend: {
      colors: {
        gray: {
          750: '#2d374d',
        },
      },
  },
},
  plugins: [],
} satisfies Config;
