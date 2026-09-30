/* ==========================================================
   PIEZA: Vista: Inicio de sesion
   Paso de armado: 7
   Requiere: core/registry.js
   Expone: #view-login
   ========================================================== */

Overlook.views.login = `
<section id="view-login" class="hidden min-h-screen bg-[radial-gradient(circle_at_top,_#4a2b78,_#1f102f_60%)] pt-28 pb-12 flex items-center justify-center">
    <div class="max-w-md w-full mx-4 text-center luxury-card rounded-[2rem] p-7 md:p-9 border border-white/40">
        <div class="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#e9ddff] text-[#5b2a86] text-2xl shadow-soft">✦</div>
        <h2 class="text-3xl md:text-4xl font-serif text-[#261933] mb-2">Inicia sesión</h2>
        <p class="text-sm text-gray-600 mb-8">Accede a tus reservas y sigue con la experiencia que has elegido.</p>

        <div class="mb-8">
            <label class="block text-left text-[#261933] text-xs font-bold mb-2 uppercase tracking-[0.18em]">E-mail</label>
            <input type="email" placeholder="INDICA TU DIRECCION DE EMAIL" class="w-full border border-[#d9d4f6] bg-white/85 rounded-full py-3 px-6 text-[#261933] placeholder-gray-400 focus:outline-none focus:border-[#a78bfa] focus:ring-2 focus:ring-[#e9ddff]">
            <button onclick="loginGenerico('manual')" class="w-full mt-4 luxury-button py-3 rounded-full font-semibold uppercase tracking-[0.18em] text-sm">
                CONTINUAR
            </button>
        </div>

        <div class="flex items-center justify-center mb-6">
            <div class="h-px bg-[#d9d4f6] w-1/4"></div>
            <span class="text-[#5b2a86] px-4 text-sm font-medium uppercase tracking-[0.18em]">o usa otra opción</span>
            <div class="h-px bg-[#d9d4f6] w-1/4"></div>
        </div>

        <div class="flex justify-center gap-5">
            <button onclick="loginGenerico('Google')" class="w-16 h-16 bg-[#fff] border border-[#e9ddff] rounded-2xl flex items-center justify-center hover:scale-105 transition shadow-soft text-[#5b2a86] font-bold text-2xl">G</button>
            <button onclick="loginGenerico('Apple')" class="w-16 h-16 bg-[#fff] border border-[#e9ddff] rounded-2xl flex items-center justify-center hover:scale-105 transition shadow-soft text-[#5b2a86] font-bold text-2xl"></button>
            <button onclick="loginGenerico('Facebook')" class="w-16 h-16 bg-[#fff] border border-[#e9ddff] rounded-2xl flex items-center justify-center hover:scale-105 transition shadow-soft text-[#5b2a86] font-bold text-2xl">f</button>
        </div>
    </div>
</section>
`;
