/* ==========================================================
   PIEZA: Vista: Inicio
   Paso de armado: 7
   Requiere: core/registry.js
   Expone: #view-home
   ========================================================== */

Overlook.views.home = `
<section id="view-home" class="min-h-screen bg-hero relative flex items-center justify-center px-4 py-12">
    <div class="w-full max-w-4xl rounded-[2rem] border border-[#1d1d1b]/10 bg-[#fffdf9]/80 px-6 py-10 md:px-14 md:py-16 text-center shadow-none">
        <span class="inline-flex items-center rounded-full border border-[#1d1d1b]/10 bg-white/80 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#1d1d1b] mb-6">Refugio wellness & descanso</span>
        <h1 class="text-5xl md:text-8xl font-serif text-[#1d1d1b] mb-4 tracking-[-0.06em]">OVERLOOK</h1>
        <p class="text-lg md:text-2xl font-serif italic mb-10 text-[#3b3b39]">Come and stay forever, and ever, and ever...</p>
        <div class="flex flex-col sm:flex-row justify-center items-center gap-4">
            <button onclick="navigate('rooms')" class="luxury-button px-8 py-3 rounded-full uppercase text-sm tracking-[0.18em] font-semibold">Buscar Habitaciones</button>
            <button onclick="navigate('about')" class="secondary-button px-8 py-3 rounded-full uppercase text-sm tracking-[0.18em] font-semibold">Descubrir más</button>
        </div>
    </div>
</section>
`;
