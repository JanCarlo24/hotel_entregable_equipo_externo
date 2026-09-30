/* ==========================================================
   PIEZA: Vista: Mis reservas (contenedor)
   Paso de armado: 7
   Requiere: core/registry.js
   Expone: #view-reservations
   ========================================================== */

Overlook.views.reservations = `
<section id="view-reservations" class="hidden min-h-screen bg-[#f7f2ed] pt-28 pb-12">
    <div class="container mx-auto px-6 max-w-4xl">
        <div class="flex justify-between items-center mb-10 gap-4 flex-wrap">
            <h2 class="text-4xl font-serif text-[#18252B]">Mis Reservaciones</h2>
            <button onclick="logout()" class="px-4 py-2 bg-[#f0e4dc] text-[#7a3f38] rounded-full hover:bg-[#e6d3c6] text-sm font-semibold transition">Cerrar Sesión</button>
        </div>
        <div id="reservations-list" class="space-y-6">
            <!-- Se inyecta con JS -->
        </div>
    </div>
</section>
`;
