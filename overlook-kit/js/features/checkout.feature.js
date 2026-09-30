let checkoutRequest = 0;

function checkoutError(message) {
    const node = document.getElementById('checkout-error');
    if (node) node.textContent = message || '';
}

function wipeCardFields() {
    ['card-number', 'card-exp', 'card-cvv'].forEach(id => {
        const field = document.getElementById(id);
        if (field) field.value = '';
    });
}

function cardFormatOk() {
    const number = document.getElementById('card-number').value.replace(/\s+/g, '');
    const exp = document.getElementById('card-exp').value.trim();
    const cvv = document.getElementById('card-cvv').value.trim();
    return /^\d{16}$/.test(number) && /^(0[1-9]|1[0-2])\/\d{2}$/.test(exp) && /^\d{3,4}$/.test(cvv);
}

function stayProblem() {
    const dates = Overlook.dates;
    const checkin = document.getElementById('checkin-date');
    const checkout = document.getElementById('checkout-date');
    checkin.setCustomValidity('');
    checkout.setCustomValidity('');
    if (!checkin.value || !checkout.value) return 'Elige las fechas de llegada y salida.';
    const start = dates.parse(checkin.value);
    const end = dates.parse(checkout.value);
    if (!start || !end) return 'Revisa las fechas de llegada y salida.';
    if (start < dates.today()) return 'La llegada no puede ser anterior a hoy.';
    const nights = dates.nightsBetween(start, end);
    if (!nights || nights < 1) {
        checkout.setCustomValidity('La salida debe ser posterior a la llegada.');
        return 'La salida debe ser posterior a la llegada.';
    }
    if (nights > dates.MAX_NIGHTS) {
        checkout.setCustomValidity('La estancia máxima es de ' + dates.MAX_NIGHTS + ' noches.');
        return 'La estancia máxima es de ' + dates.MAX_NIGHTS + ' noches.';
    }
    const horizon = dates.addDays(dates.today(), dates.MAX_ADVANCE_DAYS);
    if (start > horizon) {
        checkin.setCustomValidity('Solo puedes reservar con hasta ' + dates.MAX_ADVANCE_DAYS + ' días de anticipación.');
        return 'Solo puedes reservar con hasta ' + dates.MAX_ADVANCE_DAYS + ' días de anticipación.';
    }
    return '';
}

function updateSummary() {
    const room = Overlook.state.roomToBook;
    const math = document.getElementById('checkout-math');
    const dates = Overlook.dates;
    if (!room || !math) return;
    document.getElementById('checkout-title').textContent = room.name;
    document.getElementById('summary-room').textContent = room.name;
    document.getElementById('summary-rate').textContent = dates.formatMoney(room.priceNum) + ' / noche';
    const photo = document.getElementById('checkout-photo');
    if (room.img && photo.getAttribute('src') !== room.img) {
        photo.src = room.img;
        photo.alt = 'Habitación ' + room.name;
    }
    const checkinValue = document.getElementById('checkin-date').value;
    const checkoutValue = document.getElementById('checkout-date').value;
    const start = dates.parse(checkinValue);
    const end = dates.parse(checkoutValue);
    document.getElementById('summary-checkin').textContent = start ? dates.formatDate(start) : '—';
    document.getElementById('summary-checkout').textContent = end ? dates.formatDate(end) : '—';
    const nights = start && end ? dates.nightsBetween(start, end) : null;
    if (!start || !end || !nights || nights < 1) {
        document.getElementById('summary-nights').textContent = '—';
        document.getElementById('summary-total').textContent = '—';
        math.textContent = 'Elige una llegada y una salida válidas para ver el total.';
        return;
    }
    if (nights > dates.MAX_NIGHTS) {
        document.getElementById('summary-nights').textContent = dates.nightsLabel(nights);
        document.getElementById('summary-total').textContent = '—';
        math.textContent = 'La estancia máxima es de ' + dates.MAX_NIGHTS + ' noches.';
        return;
    }
    const total = room.priceNum * nights;
    const label = dates.nightsLabel(nights);
    document.getElementById('summary-nights').textContent = label;
    document.getElementById('summary-total').textContent = dates.formatMoney(total);
    math.textContent = label + ' × ' + dates.formatMoney(room.priceNum) + ' = ' + dates.formatMoney(total);
}

function syncDateLimits() {
    const dates = Overlook.dates;
    const checkinInput = document.getElementById('checkin-date');
    const checkoutInput = document.getElementById('checkout-date');
    const today = dates.today();
    const todayISO = dates.toISO(today);
    const maxIn = dates.toISO(dates.addDays(today, dates.MAX_ADVANCE_DAYS));
    checkinInput.min = todayISO;
    checkinInput.max = maxIn;
    const start = dates.parse(checkinInput.value);
    if (!start) {
        checkoutInput.min = dates.toISO(dates.addDays(today, 1));
        checkoutInput.max = dates.toISO(dates.addDays(today, dates.MAX_ADVANCE_DAYS + dates.MAX_NIGHTS));
        updateSummary();
        return;
    }
    const minOut = dates.addDays(start, 1);
    const maxOut = dates.addDays(start, dates.MAX_NIGHTS);
    checkoutInput.min = dates.toISO(minOut);
    checkoutInput.max = dates.toISO(maxOut);
    const end = dates.parse(checkoutInput.value);
    if (checkoutInput.value && (!end || end <= start)) checkoutInput.value = dates.toISO(minOut);
    updateSummary();
}

function prepareCheckout(room) {
    const dates = Overlook.dates;
    const checkinInput = document.getElementById('checkin-date');
    const checkoutInput = document.getElementById('checkout-date');
    const today = dates.today();
    checkinInput.value = dates.toISO(today);
    checkoutInput.value = dates.toISO(dates.addDays(today, 1));
    Overlook.state.roomToBook = room;
    checkoutError('');
    syncDateLimits();
}

window.startCheckout = async function startCheckout(roomId) {
    const request = ++checkoutRequest;
    const generation = Overlook.router.generation;
    let rooms;
    try {
        rooms = await Overlook.services.booking.listRooms();
    } catch (error) {
        Overlook.flash(Overlook.userMessage(error, 'No se pudieron cargar las habitaciones.'), 'alert');
        return;
    }
    if (request !== checkoutRequest || generation !== Overlook.router.generation) return;
    const wanted = /^\d+$/.test(String(roomId).trim()) ? Number(String(roomId).trim()) : roomId;
    const selected = rooms.find(room => room.id === wanted);
    if (!selected || selected.qty <= 0) {
        Overlook.state.clearCheckout();
        Overlook.flash('Esa habitación ya no tiene disponibilidad.', 'alert');
        if (Overlook.router.active !== 'rooms') await navigate('rooms');
        else if (typeof renderRooms === 'function') await renderRooms();
        return;
    }
    if (!Overlook.services.auth.getStoredUser()) {
        Overlook.state.roomToBook = selected;
        await navigate('login');
        return;
    }
    prepareCheckout(selected);
    await navigate('checkout');
};

window.initCheckoutForm = function initCheckoutForm() {
    const form = document.getElementById('checkout-form');
    const checkinInput = document.getElementById('checkin-date');
    const checkoutInput = document.getElementById('checkout-date');
    const button = form.querySelector('[type=submit]');
    const originalLabel = button.textContent;
    let busy = false;
    checkinInput.addEventListener('input', syncDateLimits);
    checkinInput.addEventListener('change', syncDateLimits);
    checkoutInput.addEventListener('input', updateSummary);
    checkoutInput.addEventListener('change', updateSummary);
    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (busy) return;
        checkoutError('');
        const problem = stayProblem();
        if (problem) {
            checkoutError(problem);
            form.reportValidity();
            return;
        }
        if (!cardFormatOk()) {
            checkoutError('Revisa el número, el vencimiento (MM/AA) y el CVV. Es una simulación.');
            return;
        }
        const room = Overlook.state.roomToBook;
        const user = Overlook.services.auth.getStoredUser();
        if (!user || !room) {
            checkoutError('Selecciona una habitación e inicia sesión.');
            return;
        }
        busy = true;
        button.disabled = true;
        button.textContent = 'Guardando…';
        const payload = {
            roomId: room.id,
            userEmail: user.email,
            checkin: checkinInput.value,
            checkout: checkoutInput.value
        };
        wipeCardFields();
        try {
            await Overlook.services.booking.book(payload);
            Overlook.state.clearCheckout();
            form.reset();
            Overlook.flash('¡Reserva confirmada! Ya puedes verla en Mis reservas.', 'status');
            await navigate('reservations');
        } catch (error) {
            checkoutError(Overlook.userMessage(error, 'No se pudo completar la reserva. Intenta de nuevo.'));
        } finally {
            busy = false;
            button.disabled = false;
            button.textContent = originalLabel;
        }
    });
};

Overlook.router.onEnter('checkout', () => {
    if (Overlook.state.roomToBook) updateSummary();
});
