// Plantilla reutilizable; recibe datos y devuelve HTML.
Overlook.components.reservationCard = function(res) {

return `
        <div class="bg-white/90 p-6 rounded-[1.75rem] shadow-soft flex flex-col md:flex-row md:justify-between md:items-center gap-4 border-l-8 border-[#d76d84]">
            <div>
                <p class="text-[10px] tracking-[0.18em] text-gray-500 font-bold mb-2 uppercase">Código: ${res.id}</p>
                <h4 class="text-2xl font-serif text-[#1f3e3d]">${res.roomName}</h4>
                <p class="text-sm text-gray-600 mt-2">Llegada: <span class="font-semibold text-[#1e2a2b]">${res.checkin}</span> | Salida: <span class="font-semibold text-[#1e2a2b]">${res.checkout}</span></p>
                <p class="text-sm text-gray-800 font-bold mt-2">Total: ${res.price} / Noche · ${res.nights} noches · $${res.total} MXN</p>
            </div>
            <button onclick="openCancelModal('${res.id}')" class="px-4 py-3 border border-[#d76d84] text-[#b2475f] rounded-full hover:bg-[#fff1f4] transition text-sm font-semibold uppercase tracking-[0.14em]">
                Cancelar
            </button>
        </div>
    `;
};
