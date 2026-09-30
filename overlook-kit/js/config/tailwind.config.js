/* Misma paleta que :root en css/styles.css. Si el CDN no cargó, no hay objeto tailwind. */
if (typeof tailwind !== 'undefined') {
    tailwind.config = {
        theme: {
            extend: {
                colors: {
                    overlook: {
                        bg: '#F4EFE8',
                        surface: '#FFFDF9',
                        ink: '#1D1D1B',
                        muted: '#5C5854',
                        terracotta: '#7A4638',
                        line: '#E4D9CE'
                    }
                },
                fontFamily: {
                    serif: ['"Playfair Display"', 'Georgia', 'serif'],
                    sans: ['Montserrat', '"Segoe UI"', 'sans-serif']
                }
            }
        }
    };
}
