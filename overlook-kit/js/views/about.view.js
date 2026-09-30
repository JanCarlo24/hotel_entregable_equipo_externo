/* ==========================================================
   PIEZA: Vista: Sobre nosotros
   Paso de armado: 7
   Requiere: core/registry.js
   Expone: #view-about
   ========================================================== */

Overlook.views.about = `
<section id="view-about" class="hidden min-h-screen bg-[#f5f1ea] pt-24 pb-12">
    <div class="container mx-auto px-6">
        <h2 class="text-5xl md:text-6xl font-serif text-[#1d1d1b] text-center mb-16 mt-10">Sobre Nosotros</h2>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div class="rounded-3xl border border-[#1d1d1b]/10 bg-[#fffdf9] p-7 text-center">
                <h3 class="text-2xl font-serif text-[#1d1d1b] mb-4">Nuestra Esencia</h3>
                <p class="text-[#3d3d3a] font-sans text-sm leading-relaxed">Sumérgete en el paraíso. Somos más que un hotel; somos tu refugio de descanso con vistas que reconfortan el alma. Brinda con nosotros por días inolvidables frente al mar.</p>
            </div>

            <div class="rounded-3xl border border-[#1d1d1b]/10 bg-[#fffdf9] p-7 text-center">
                <h3 class="text-2xl font-serif text-[#1d1d1b] mb-4">Confort Integrado</h3>
                <p class="text-[#3d3d3a] font-sans text-sm leading-relaxed">Imagina despertar cada mañana con la suave brisa del mar y la luz dorada inundando tu habitación. Espacios diseñados para tu máximo confort y tranquilidad absoluta.</p>
            </div>

            <div class="rounded-3xl border border-[#1d1d1b]/10 bg-[#fffdf9] p-7 text-center">
                <h3 class="text-2xl font-serif text-[#1d1d1b] mb-4">Gastronomía a la Orilla</h3>
                <p class="text-[#3d3d3a] font-sans text-sm leading-relaxed">Vive experiencias gastronómicas exclusivas. Una cena bajo las estrellas a la orilla de la piscina y a solo unos pasos de la arena. Momentos perfectos para compartir.</p>
            </div>
        </div>
    </div>
</section>
`;
