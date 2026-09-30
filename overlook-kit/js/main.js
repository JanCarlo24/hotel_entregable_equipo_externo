/* ==========================================================
   PIEZA: Arranque de la aplicacion (la pieza que enciende todo)
   Paso de armado: 9
   Requiere: TODAS las anteriores
   Expone: nada
   ========================================================== */

(async function () {
    // Orden en que se apilan las vistas dentro de <main>
    const VIEW_ORDER = ['home', 'about', 'rooms', 'checkout', 'login', 'reservations'];

    // 1) Montar HTML
    document.getElementById('navbar-root').innerHTML = Overlook.components.navbar;
    document.getElementById('modal-root').innerHTML = Overlook.components.cancelModal;
    document.getElementById('app-content').innerHTML = VIEW_ORDER.map(id => Overlook.views[id]).join('\n');

    // 2) Conectar eventos que dependen del HTML ya montado
    initCheckoutForm();
    initCancelFlow();

    // 3) Estado inicial
    updateAuthUI();
    await navigate('home');
    // Las dos listas se cargan concurrentemente; los fallos son independientes.
    window.refreshOverlook = () => Promise.allSettled([renderRooms(), renderReservations()]);
    await refreshOverlook();
    window.addEventListener('overlook:data-changed', refreshOverlook);
    // En otras pestañas, refrescar al recuperar foco muestra el inventario actual.
    window.addEventListener('focus', refreshOverlook);

})();
