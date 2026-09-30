Overlook.components.reservationCard = function reservationCard(res) {
    const nightly = typeof res.price === 'number' ? res.price : Number(String(res.price ?? '').replace(/[^\d.]/g, ''));
    const nights = Number(res.nights);
    const total = Number(res.total);
    const line = Overlook.dates.formatMoney(nightly) + ' × ' + Overlook.dates.nightsLabel(nights) + ' = ' + Overlook.dates.formatMoney(total);
    const id = String(res.id ?? '');
    const shortCode = (id.length > 12 ? id.slice(0, 12) : id).toUpperCase();
    return `
        <article class="res-card">
            <div class="res-copy">
                <p class="code-label">Código <strong class="code-short">${Overlook.escape(shortCode)}</strong></p>
                <details class="code-details">
                    <summary>Ver código completo</summary>
                    <code>${Overlook.escape(id)}</code>
                </details>
                <button type="button" class="text-button" data-action="copy-code" data-code="${Overlook.escape(id)}">Copiar código</button>
                <h2>${Overlook.escape(res.roomName)}</h2>
                <p class="res-dates">Llegada: <time datetime="${Overlook.escape(res.checkin)}">${Overlook.escape(Overlook.dates.formatDate(res.checkin))}</time>
                    · Salida: <time datetime="${Overlook.escape(res.checkout)}">${Overlook.escape(Overlook.dates.formatDate(res.checkout))}</time></p>
                <p class="res-total">${Overlook.escape(line)}</p>
            </div>
            <button type="button" class="btn-danger-ghost" data-action="open-cancel" data-reservation-id="${Overlook.escape(id)}">Cancelar reserva</button>
        </article>`;
};
