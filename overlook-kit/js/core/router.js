/* ==========================================================
   PIEZA: Navegacion entre vistas
   Paso de armado: 4
   Requiere: HTML montado (main.js). Llama a renderRooms() y renderReservations()
   Expone: window.navigate(viewId)
   ========================================================== */

// SISTEMA DE NAVEGACIÓN
window.toggleNavMenu = function() {
    const navLinks = document.getElementById('nav-links');
    const navToggle = document.getElementById('nav-toggle');
    if (!navLinks || !navToggle) return;

    const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!isExpanded));
    navToggle.setAttribute('aria-label', isExpanded ? 'Abrir menú' : 'Cerrar menú');
    navLinks.classList.toggle('hidden', isExpanded);
}

window.navigate = async function(viewId) {
    if (!Overlook.views[viewId]) return;
    if (viewId === 'reservations' && !localStorage.getItem('overlook_user')) viewId = 'login';
    document.querySelectorAll('main > section').forEach(el => el.classList.add('hidden'));
    document.getElementById('view-' + viewId).classList.remove('hidden');

    const navLinks = document.getElementById('nav-links');
    const navToggle = document.getElementById('nav-toggle');
    if (navLinks && navToggle) {
        navLinks.classList.add('hidden');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.setAttribute('aria-label', 'Abrir menú');
    }

    if (viewId === 'rooms') await renderRooms();

    if(viewId === 'reservations') await renderReservations();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
