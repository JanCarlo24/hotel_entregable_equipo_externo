/* ==========================================================
   PIEZA: Componente: barra de navegacion
   Paso de armado: 6
   Requiere: core/registry.js
   Expone: #navbar, #nav-links, #btn-auth
   ========================================================== */

Overlook.components.navbar = `
<nav class="fixed w-full z-50 top-0 border-b border-[#1d1d1b]/10 bg-[#f5f1ea]/95 backdrop-blur-sm transition-all duration-300" id="navbar">
    <div class="container mx-auto px-6 py-4 flex flex-wrap gap-3 justify-between items-center">
        <div class="flex items-center space-x-2 cursor-pointer" onclick="navigate('home')">
            <span class="text-[#1d1d1b] text-2xl font-serif tracking-[0.25em]">OVERLOOK</span>
        </div>
        <button id="nav-toggle" type="button" aria-controls="nav-links" aria-expanded="false" aria-label="Abrir menú" onclick="toggleNavMenu()" class="md:hidden p-2 text-[#1d1d1b]" >
            <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                <path stroke-linecap="round" d="M4 7h16M4 12h16M4 17h16"></path>
            </svg>
        </button>
        <div class="hidden w-full flex-col items-stretch gap-2 pt-3 md:flex md:w-auto md:flex-row md:items-center md:pt-0" id="nav-links">
            <button onclick="navigate('about')" class="w-full px-4 py-2 border border-[#1d1d1b]/15 text-[#1d1d1b] rounded-full hover:bg-white/70 transition text-sm tracking-[0.12em] font-medium md:w-auto">SOBRE NOSOTROS</button>
            <button onclick="navigate('rooms')" class="w-full px-4 py-2 border border-[#1d1d1b]/15 text-[#1d1d1b] rounded-full hover:bg-white/70 transition text-sm tracking-[0.12em] font-medium md:w-auto">HABITACIONES</button>
            <button id="btn-auth" onclick="navigate('login')" class="w-full px-4 py-2 border border-[#1d1d1b]/15 text-[#1d1d1b] rounded-full hover:bg-white/70 transition text-sm tracking-[0.12em] font-medium md:w-auto">INICIAR SESIÓN</button>
        </div>
    </div>
</nav>
`;
