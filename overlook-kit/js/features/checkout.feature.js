/* ==========================================================
   PIEZA: Funcion: flujo de reserva con fechas
   Paso de armado: 8
   Requiere: state.js, router.js, vista checkout
   Expone: window.startCheckout(roomId), window.initCheckoutForm()  <- esta ultima la llama main.js
   ========================================================== */

// FLUJO DE RESERVA CON FECHAS
let checkoutRequest = 0;
window.startCheckout = async function(roomId) {
    const user = getStoredUser();
    const request = ++checkoutRequest;
    let rooms;
    try { rooms = await Overlook.services.booking.listRooms(); } catch (error) { alert(error.message); return; }
    if (request !== checkoutRequest) return;
    const selectedRoom = rooms.find(r => r.id === roomId);
    currentRoomToBook = selectedRoom || null;
    if (!currentRoomToBook || currentRoomToBook.qty <= 0) { alert("Sin disponibilidad."); return; }

    if (!user) {
        currentRoomToBook = { ...currentRoomToBook };
        window.navigate('login');
        return;
    }

    document.getElementById('checkout-title').textContent = currentRoomToBook.name;
    document.getElementById('checkout-price').textContent = 'Total a pagar: ' + currentRoomToBook.price + ' MXN / Noche';

    // Configurar fechas minimas
    const checkinInput = document.getElementById('checkin-date');
    const checkoutInput = document.getElementById('checkout-date');

    // Forzar formato YYYY-MM-DD local
    const now = new Date();
    const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

    checkinInput.min = todayStr;
    checkinInput.value = todayStr;

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.getFullYear() + '-' + String(tomorrow.getMonth() + 1).padStart(2, '0') + '-' + String(tomorrow.getDate()).padStart(2, '0');

    checkoutInput.min = tomorrowStr;
    checkoutInput.value = tomorrowStr;

    checkinInput.onchange = function() {
        const nextDay = new Date(this.value + 'T12:00:00'); // Evitar problemas de zona horaria
        nextDay.setDate(nextDay.getDate() + 1);
        const nextDayStr = nextDay.getFullYear() + '-' + String(nextDay.getMonth() + 1).padStart(2, '0') + '-' + String(nextDay.getDate()).padStart(2, '0');

        checkoutInput.min = nextDayStr;
        if(new Date(checkoutInput.value) <= new Date(this.value)) {
            checkoutInput.value = nextDayStr;
        }
    };

    window.navigate('checkout');
}


window.initCheckoutForm = function() {
    let busy = false;
    document.getElementById('checkout-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        if (busy) return;
        busy = true;
        const button = this.querySelector('[type=submit]');
        button.disabled = true;
        button.textContent = 'Guardando…';
        try {
            const user = getStoredUser();
            if (!user || !currentRoomToBook) throw new Error('Selecciona una habitación e inicia sesión.');
            await Overlook.services.booking.book({ roomId: currentRoomToBook.id, userEmail: user.email,
                checkin: document.getElementById('checkin-date').value,
                checkout: document.getElementById('checkout-date').value });
            currentRoomToBook = null;
            this.reset();
            await window.navigate('reservations');
        } catch (error) { alert(error.message); }
        finally { busy = false; button.disabled = false; button.textContent = 'Confirmar y Pagar'; }
    });
};
