import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        sans: ["Inter", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          hover: "hsl(210 84% 34%)",
          active: "hsl(210 84% 26%)",
          light: "hsl(210 84% 96%)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
          hover: "hsl(163 97% 44%)",
          active: "hsl(163 97% 38%)",
          light: "hsl(163 97% 96%)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        brand: {
          blue: "hsl(var(--brand-blue))",
          amber: "hsl(var(--brand-amber))",
          green: "hsl(var(--brand-green))",
          red: "hsl(var(--brand-red))",
          cyan: "hsl(var(--brand-cyan))",
          purple: "hsl(var(--brand-purple))",
        },
        risk: {
          high: "hsl(var(--risk-high))",
          medium: "hsl(var(--risk-medium))",
          low: "hsl(var(--risk-low))",
          strong: "hsl(var(--risk-strong))",
        },
        status: {
          error: "hsl(var(--status-error))",
          "error-bg": "hsl(var(--status-error-bg))",
          warning: "hsl(var(--status-warning))",
          "warning-bg": "hsl(var(--status-warning-bg))",
          success: "hsl(var(--status-success))",
          "success-bg": "hsl(var(--status-success-bg))",
          info: "hsl(var(--status-info))",
          "info-bg": "hsl(var(--status-info-bg))",
          ai: "hsl(var(--status-ai))",
          "ai-bg": "hsl(var(--status-ai-bg))",
        },
        /* Text scale */
        heading: "hsl(211 70% 12%)",
        body: "hsl(213 22% 37%)",
        subtle: "hsl(213 13% 55%)",
        disabled: "hsl(213 13% 63%)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        glow: "var(--shadow-glow)",
        alert: "var(--shadow-alert)",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        pulse: { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0.4" } },
        "slide-in-right": { from: { transform: "translateX(100%)", opacity: "0" }, to: { transform: "translateX(0)", opacity: "1" } },
        "fade-in": { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        glow: {
          "0%, 100%": { boxShadow: "0 0 8px hsl(210 84% 40% / 0.4)" },
          "50%": { boxShadow: "0 0 24px hsl(210 84% 40% / 0.8)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "fade-in": "fade-in 0.4s ease-out",
        glow: "glow 2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
