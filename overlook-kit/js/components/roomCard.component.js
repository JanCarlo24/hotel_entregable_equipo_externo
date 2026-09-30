Overlook.components.roomCard = function roomCard(room) {
    const sold = Number(room.qty) <= 0;
    const money = Overlook.dates.formatMoney(room.priceNum);
    return `
        <article class="room-card">
            <div class="room-photo">
                <img src="${Overlook.escape(room.img)}" alt="${Overlook.escape(room.name)}" width="720" height="480" loading="lazy" decoding="async">
                <span hidden class="photo-fallback">Imagen no disponible</span>
            </div>
            <div class="room-body">
                <p class="pax">${Overlook.escape(room.pax)}</p>
                <h2>${Overlook.escape(room.name)}</h2>
                <p class="price">${money} / noche</p>
                <p class="stock ${sold ? 'is-out' : 'is-in'}">${sold ? 'Agotada' : 'Unidades en inventario: ' + Overlook.escape(room.qty)}</p>
                <button type="button" class="luxury-button btn-block" data-action="book" data-room-id="${Overlook.escape(room.id)}" ${sold ? 'disabled' : ''}>
                    ${sold ? 'Sin disponibilidad' : 'Reservar'}
                </button>
            </div>
        </article>`;
};
