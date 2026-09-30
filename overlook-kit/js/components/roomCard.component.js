// Plantilla reutilizable; recibe datos y devuelve HTML.
Overlook.components.roomCard = function(room) {
const isSoldOut = room.qty <= 0;
return `
            <article class="bg-white/85 rounded-[2rem] overflow-hidden shadow-luxe p-4 flex flex-col transition duration-200 hover:-translate-y-1 border border-white/60 h-full">
                <div class="relative w-full h-52 rounded-[1.5rem] overflow-hidden bg-[#ece2d7] mb-4">
                    <img src="${room.img}" alt="${room.name}" class="absolute inset-0 w-full h-full object-cover ${isSoldOut ? 'grayscale' : ''}" onerror="this.hidden=true; this.parentElement.classList.add('room-image-fallback'); this.nextElementSibling.hidden=false">
                    <span hidden class="px-4 text-center text-sm text-[#5b5954]">Imagen de habitación no disponible</span>
                </div>
                <div class="text-center flex-grow flex flex-col justify-between">
                    <div>
                        <p class="text-[10px] tracking-[0.22em] text-[#5a6466] mb-2 uppercase">${room.pax}</p>
                        <h3 class="text-2xl font-serif text-[#1f3e3d] mb-2">${room.name}</h3>
                        <p class="text-sm italic text-gray-600 mb-3">Desde ${room.price} por noche</p>
                        <p class="text-xs font-bold ${isSoldOut ? 'text-[#b34d5a]' : 'text-[#1f7a64]'} mb-4 uppercase tracking-[0.12em]">
                            ${isSoldOut ? 'Agotada' : 'Disponibles: ' + room.qty}
                        </p>
                    </div>
                    <button onclick="startCheckout(${room.id})" 
                        ${isSoldOut ? 'disabled' : ''}
                        class="w-full py-3 rounded-full text-sm font-semibold uppercase tracking-[0.14em] transition ${isSoldOut ? 'bg-[#eae8e6] text-gray-400 cursor-not-allowed' : 'luxury-button'}">
                        ${isSoldOut ? 'Sin disponibilidad' : 'Reservar'}
                    </button>
                </div>
            </article>
        `;
};
