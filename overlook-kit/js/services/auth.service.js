/* ==========================================================
   PIEZA: Servicio de autenticacion (simulado)
   Paso de armado: 5
   Requiere: router.js, state.js
   Expone: updateAuthUI(), window.loginGenerico(provider), window.logout()
   ========================================================== */

function getStoredUser() {
    try {
        const raw = localStorage.getItem('overlook_user');
        if (!raw) return null;
        const user = JSON.parse(raw);
        return user && user.email ? user : null;
    } catch (error) {
        localStorage.removeItem('overlook_user');
        return null;
    }
}

// SISTEMA DE AUTENTICACIÓN
function updateAuthUI() {
    const user = getStoredUser();
    const btnAuth = document.getElementById('btn-auth');
    const navLinks = document.getElementById('nav-links');

    const oldResBtn = document.getElementById('btn-mis-reservas');
    if(oldResBtn) oldResBtn.remove();

    if (!btnAuth || !navLinks) return;

    if (user) {
        btnAuth.textContent = user.nombre || 'Mi cuenta';
        btnAuth.onclick = () => window.navigate('reservations');

        const resBtn = document.createElement('button');
        resBtn.id = 'btn-mis-reservas';
        resBtn.innerText = 'MIS RESERVAS';
        resBtn.className = 'w-full px-4 py-2 border border-[#1d1d1b]/15 text-[#1d1d1b] rounded-full hover:bg-white/70 transition text-sm tracking-[0.12em] font-medium md:w-auto';
        resBtn.onclick = () => window.navigate('reservations');
        navLinks.insertBefore(resBtn, btnAuth);
    } else {
        btnAuth.textContent = 'INICIAR SESIÓN';
        btnAuth.onclick = () => window.navigate('login');
    }
}

window.loginGenerico = function(provider) {
    let email = 'invitado@overlook.com';
    let nombre = 'Usuario';

    if (provider === 'Apple') { email = 'invitado@icloud.com'; nombre = 'Usuario Apple'; }
    else if (provider === 'Google') { email = 'invitado@gmail.com'; nombre = 'Usuario Google'; }
    else if (provider === 'Facebook') { email = 'invitado@facebook.com'; nombre = 'Usuario Facebook'; }

    if (provider === 'manual') {
        const input = document.querySelector('#view-login input[type=email]');
        if (!input) return;
        const value = (input.value || '').trim().toLowerCase();
        if (!value || !input.checkValidity()) {
            input.focus();
            input.reportValidity();
            return;
        }
        email = value;
        nombre = 'Usuario manual';
    }

    const user = { email, nombre };
    localStorage.setItem('overlook_user', JSON.stringify(user));
    updateAuthUI();

    if (currentRoomToBook) {
        const roomId = currentRoomToBook.id;
        currentRoomToBook = null;
        window.startCheckout(roomId);
        return;
    }

    window.navigate('rooms');
}

window.logout = function() {
    localStorage.removeItem('overlook_user');
    updateAuthUI();
    window.navigate('home');
}
