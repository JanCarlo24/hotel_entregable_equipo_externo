/* ==========================================================
   PIEZA: Configuracion de Tailwind (colores y fuentes)
   Paso de armado: 2
   Requiere: CDN de Tailwind cargado antes
   Expone: tailwind.config
   ========================================================== */

tailwind.config = {
    theme: {
        extend: {
            colors: {
                overlook: {
                    bg: '#F4EFE8',
                    dark: '#18252B',
                    forest: '#2F4F4A',
                    sage: '#7C9585',
                    sand: '#D9C4A1',
                    terracotta: '#B65F52',
                    rose: '#D89A8A',
                    cream: '#FFF9F3',
                    ink: '#1E2B2D',
                    moss: '#6D7D69',
                    taupe: '#E9DED1',
                    pink: '#E8B1A9'
                }
            },
            fontFamily: {
                serif: ['"Playfair Display"', 'serif'],
                sans: ['Montserrat', 'sans-serif'],
            },
            boxShadow: {
                luxe: '0 20px 50px rgba(24, 37, 43, 0.12)',
                soft: '0 14px 28px rgba(30, 43, 45, 0.10)'
            }
        }
    }
}
