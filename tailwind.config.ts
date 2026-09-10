import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

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
				sans: ['"Nunito Sans"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Arial', 'sans-serif'],
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: {
					DEFAULT: 'hsl(var(--background))',
					secondary: 'hsl(var(--background-secondary))'
				},
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					light: 'hsl(var(--primary-light))',
					dark: 'hsl(var(--primary-dark))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				success: {
					DEFAULT: 'hsl(var(--success))',
					foreground: 'hsl(var(--success-foreground))'
				},
				warning: {
					DEFAULT: 'hsl(var(--warning))',
					foreground: 'hsl(var(--warning-foreground))'
				},
				entry: {
					DEFAULT: 'hsl(var(--entry))',
					foreground: 'hsl(var(--entry-foreground))'
				},
				exit: {
					DEFAULT: 'hsl(var(--exit))',
					foreground: 'hsl(var(--exit-foreground))'
				},
				transfer: {
					DEFAULT: 'hsl(var(--transfer))',
					foreground: 'hsl(var(--transfer-foreground))'
				},
				'new-product': {
					DEFAULT: 'hsl(var(--new-product))',
					foreground: 'hsl(var(--new-product-foreground))'
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
					secondary: 'hsl(var(--card-secondary))',
					foreground: 'hsl(var(--card-foreground))'
				},
				'category-electronics': {
					DEFAULT: 'hsl(var(--category-electronics))',
					foreground: 'hsl(var(--category-electronics-foreground))'
				},
				'category-office': {
					DEFAULT: 'hsl(var(--category-office))',
					foreground: 'hsl(var(--category-office-foreground))'
				},
				'category-cleaning': {
					DEFAULT: 'hsl(var(--category-cleaning))',
					foreground: 'hsl(var(--category-cleaning-foreground))'
				},
				'category-maintenance': {
					DEFAULT: 'hsl(var(--category-maintenance))',
					foreground: 'hsl(var(--category-maintenance-foreground))'
				},
				'category-kitchen': {
					DEFAULT: 'hsl(var(--category-kitchen))',
					foreground: 'hsl(var(--category-kitchen-foreground))'
				},
				'category-others': {
					DEFAULT: 'hsl(var(--category-others))',
					foreground: 'hsl(var(--category-others-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					background: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				ios: {
					bg: 'hsl(var(--ios-bg))',
					card: 'hsl(var(--ios-card))',
					text: 'hsl(var(--ios-text))',
					blue: 'hsl(var(--ios-blue))',
					green: 'hsl(var(--ios-green))',
					red: 'hsl(var(--ios-red))',
					orange: 'hsl(var(--ios-orange))',
					gray: 'hsl(var(--ios-gray))'
				},
				unit: {
					DEFAULT: 'hsl(var(--unit-default))',
					default: 'hsl(var(--unit-default))',
					'unig-ni': 'hsl(var(--unit-unig-ni))',
					'unig-centro': 'hsl(var(--unit-unig-centro))',
					'unig-itaperuna': 'hsl(var(--unit-unig-itaperuna))',
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
				xl: 'var(--radius-large)',
				ios: '18px',
				'ios-lg': '24px'
			},
			boxShadow: {
				'card': 'var(--shadow-card)',
				'elevated': 'var(--shadow-elevated)',
				'glow': 'var(--shadow-glow)',
				'ios-card': 'var(--shadow-ios-card)',
				'ios-bar': 'var(--shadow-ios-bar)'
			},
			backgroundImage: {
				'gradient-primary': 'var(--gradient-primary)',
				'gradient-card': 'var(--gradient-card)',
				'gradient-success': 'var(--gradient-success)',
				'gradient-warning': 'var(--gradient-warning)'
			},
			keyframes: {
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--radix-accordion-content-height)' }
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: '0' }
				},
				'ripple': {
					'0%': { transform: 'scale(0)', opacity: '1' },
					'100%': { transform: 'scale(4)', opacity: '0' }
				},
				'pulse-slow': {
					'0%, 100%': { opacity: '1' },
					'50%': { opacity: '0.5' }
				},
				'fade-in': {
					'0%': { opacity: '0', transform: 'translateY(8px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},
				'fade-out': {
					'0%': { opacity: '1', transform: 'translateY(0)' },
					'100%': { opacity: '0', transform: 'translateY(8px)' }
				},
				'scale-in': {
					'0%': { opacity: '0', transform: 'scale(0.95)' },
					'100%': { opacity: '1', transform: 'scale(1)' }
				},
				'slide-in-right': {
					'0%': { transform: 'translateX(100%)', opacity: '0' },
					'100%': { transform: 'translateX(0)', opacity: '1' }
				},
				'slide-in-left': {
					'0%': { transform: 'translateX(-100%)', opacity: '0' },
					'100%': { transform: 'translateX(0)', opacity: '1' }
				},
				'slide-in-up': {
					'0%': { transform: 'translateY(100%)', opacity: '0' },
					'100%': { transform: 'translateY(0)', opacity: '1' }
				},
				'bounce-subtle': {
					'0%, 100%': { transform: 'translateY(0)' },
					'50%': { transform: 'translateY(-4px)' }
				},
				'shimmer': {
					'0%': { backgroundPosition: '-200% 0' },
					'100%': { backgroundPosition: '200% 0' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'ripple': 'ripple 0.6s linear',
				'pulse-slow': 'pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
				'fade-in': 'fade-in 0.3s ease-out forwards',
				'fade-out': 'fade-out 0.3s ease-out forwards',
				'scale-in': 'scale-in 0.2s ease-out forwards',
				'slide-in-right': 'slide-in-right 0.3s ease-out forwards',
				'slide-in-left': 'slide-in-left 0.3s ease-out forwards',
				'slide-in-up': 'slide-in-up 0.3s ease-out forwards',
				'bounce-subtle': 'bounce-subtle 0.5s ease-in-out',
				'shimmer': 'shimmer 2s linear infinite'
			}
		}
	},
	plugins: [tailwindcssAnimate],
} satisfies Config;
