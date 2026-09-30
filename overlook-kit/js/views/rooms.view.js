/* ==========================================================
   PIEZA: Vista: Habitaciones (contenedor)
   Paso de armado: 7
   Requiere: core/registry.js
   Expone: #view-rooms
   ========================================================== */

Overlook.views.rooms = `
<section id="view-rooms" class="hidden min-h-screen bg-[#f5efe8] pt-28 pb-12">
    <div class="container mx-auto px-6">
        <h2 class="text-4xl md:text-5xl font-serif text-[#18252B] text-center mb-12">Nuestras habitaciones</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8" id="rooms-container">
            <!-- Se inyecta con JS -->
        </div>
    </div>
</section>
`;
