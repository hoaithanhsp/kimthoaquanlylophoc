/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            colors: {
                military: {
                    50: '#f4f6ef',
                    100: '#e5ebd5',
                    200: '#cdd8af',
                    300: '#afc07f',
                    400: '#8fa656',
                    500: '#4A5D23',
                    600: '#3d4d1d',
                    700: '#313e18',
                    800: '#283216',
                    900: '#1f2712',
                },
                badge: {
                    50: '#fffbeb',
                    100: '#fff3c4',
                    200: '#ffe588',
                    300: '#FFD700',
                    400: '#e5c200',
                    500: '#cca900',
                },
                flame: {
                    50: '#fff5f0',
                    100: '#ffe8db',
                    200: '#ffd0b5',
                    300: '#ffb088',
                    400: '#ff8a55',
                    500: '#FF6B35',
                    600: '#e55a25',
                    700: '#bf4a1d',
                    800: '#993b17',
                    900: '#732c11',
                },
            },
            animation: {
                'slide-up': 'slide-up 0.3s ease-out forwards',
                'slide-down': 'slide-down 0.3s ease-out forwards',
                'fade-in': 'fade-in 0.2s ease-out forwards',
                'scale-in': 'scale-in 0.2s ease-out forwards',
                'rank-up': 'rank-up 0.6s ease-out forwards',
                'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
            },
            keyframes: {
                'slide-up': {
                    from: { opacity: '0', transform: 'translateY(10px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
                'slide-down': {
                    from: { opacity: '0', transform: 'translateY(-10px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
                'fade-in': {
                    from: { opacity: '0' },
                    to: { opacity: '1' },
                },
                'scale-in': {
                    from: { opacity: '0', transform: 'scale(0.95)' },
                    to: { opacity: '1', transform: 'scale(1)' },
                },
                'rank-up': {
                    '0%': { transform: 'scale(1)' },
                    '50%': { transform: 'scale(1.2)' },
                    '100%': { transform: 'scale(1)' },
                },
                'pulse-glow': {
                    '0%, 100%': { boxShadow: '0 0 5px rgba(255, 107, 53, 0.3)' },
                    '50%': { boxShadow: '0 0 20px rgba(255, 107, 53, 0.6)' },
                },
            },
        },
    },
    plugins: [],
};
