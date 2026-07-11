import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
    extend: {
      fontFamily: {
        sans: ["Outfit", "Helvetica Neue", "Arial", "sans-serif"],
        // Editorial serif for marketing headlines only (home page hero +
        // section titles) — everything else (nav, body, buttons, forms)
        // stays on Outfit. Used via `font-display`.
        display: ["Playfair Display", "Georgia", "serif"],
      },
      screens: {
        'xs': '475px',
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
					muted: 'hsl(var(--primary-muted))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				success: {
					DEFAULT: 'hsl(var(--success))',
					foreground: 'hsl(var(--success-foreground))'
				},
				warning: {
					DEFAULT: 'hsl(var(--warning))',
					foreground: 'hsl(var(--warning-foreground))'
				},
				'university-green': 'hsl(var(--university-green))',
				'university-gold': 'hsl(var(--university-gold))',
				'trust-orange': 'hsl(var(--trust-orange))',
				'verified-blue': 'hsl(var(--verified-blue))',
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				flora: {
					bgFrom: "#eef1e7",
					bgTo: "#e2e8dc",
					ink: "#1c211d",
					leaf: "#5f9a3f",
					leafBright: "#8ed957",
					tagBg: "#dcefc7",
					tagText: "#3f6b2a",
					card: "#ffffff",
					muted: "#6b7568",
					chip: "#f2f4ee",
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
				'4xl': '2rem',
				'5xl': '2.5rem'
			},
			boxShadow: {
				floating: "0 10px 30px -10px rgba(28, 33, 29, 0.25)",
				card: "0 8px 24px -8px rgba(28, 33, 29, 0.18)",
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'deal-flip-in': {
					'0%': { opacity: '0', transform: 'perspective(1400px) rotateY(75deg) rotate(var(--tilt, 0deg)) translateX(24px)' },
					'60%': { opacity: '1', transform: 'perspective(1400px) rotateY(-8deg) rotate(var(--tilt, 0deg)) translateX(-4px)' },
					'100%': { opacity: '1', transform: 'perspective(1400px) rotateY(0deg) rotate(var(--tilt, 0deg)) translateX(0)' }
				},
				'ring-in': {
					'0%': { strokeDashoffset: 'var(--ring-circumference)' },
					'100%': { strokeDashoffset: 'var(--ring-offset)' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'deal-flip-in': 'deal-flip-in 700ms cubic-bezier(0.22,1,0.36,1) both',
				'ring-in': 'ring-in 1s ease-out forwards'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
