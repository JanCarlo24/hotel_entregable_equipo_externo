Overlook.views.checkout = `
<section id="view-checkout" class="view view-pad" hidden>
    <div class="checkout-layout">
        <article class="summary-card" aria-labelledby="checkout-title">
            <div class="summary-photo room-photo">
                <img id="checkout-photo" src="img/room-deluxe.jpg" alt="" width="720" height="480">
                <span hidden class="photo-fallback">Imagen no disponible</span>
            </div>
            <p class="eyebrow">Resumen</p>
            <h1 id="checkout-title">Completar reserva</h1>
            <dl class="summary-list">
                <div><dt>Habitación</dt><dd id="summary-room">—</dd></div>
                <div><dt>Llegada</dt><dd id="summary-checkin">—</dd></div>
                <div><dt>Salida</dt><dd id="summary-checkout">—</dd></div>
                <div><dt>Noches</dt><dd id="summary-nights">—</dd></div>
                <div><dt>Precio por noche</dt><dd id="summary-rate">—</dd></div>
                <div><dt>Total</dt><dd id="summary-total">—</dd></div>
            </dl>
            <p id="checkout-math" class="math-line">Elige las fechas para ver el total.</p>
        </article>
        <form id="checkout-form" class="form-card" autocomplete="off" novalidate>
            <p class="demo-banner" role="note">Demo: no ingreses datos reales de tarjeta.</p>
            <div class="date-grid">
                <div class="field">
                    <label for="checkin-date">Llegada</label>
                    <input id="checkin-date" type="date" autocomplete="off" required>
                </div>
                <div class="field">
                    <label for="checkout-date">Salida</label>
                    <input id="checkout-date" type="date" autocomplete="off" required>
                </div>
            </div>
            <div class="field">
                <label for="card-number">Número de tarjeta</label>
                <input id="card-number" type="text" inputmode="numeric" autocomplete="off" placeholder="1234 5678 9101 1121" maxlength="19" required>
            </div>
            <div class="date-grid">
                <div class="field">
                    <label for="card-exp">Vencimiento</label>
                    <input id="card-exp" type="text" inputmode="numeric" autocomplete="off" placeholder="MM/YY" maxlength="5" required>
                </div>
                <div class="field">
                    <label for="card-cvv">CVV</label>
                    <input id="card-cvv" type="text" inputmode="numeric" autocomplete="off" placeholder="123" maxlength="4" required>
                </div>
            </div>
            <p id="checkout-error" class="form-error" role="alert"></p>
            <button type="submit" class="luxury-button btn-block">Confirmar y Pagar</button>
            <a class="back-link" href="#/rooms" data-action="cancel-checkout">← Volver a habitaciones</a>
        </form>
    </div>
</section>`;
