function tailwindLoaded() {
    return typeof window.tailwind !== 'undefined';
}

Overlook.flash = function flash(message, kind) {
    const status = document.getElementById('flash-status');
    const alertBox = document.getElementById('flash-alert');
    if (!status || !alertBox) return;
    if (kind === 'alert') {
        status.textContent = '';
        alertBox.textContent = message || '';
    } else {
        alertBox.textContent = '';
        status.textContent = message || '';
    }
};

(async function startOverlook() {
    if (!tailwindLoaded()) document.documentElement.classList.add('tw-fallback');

    const viewOrder = ['home', 'about', 'rooms', 'checkout', 'login', 'reservations'];
    document.getElementById('navbar-root').innerHTML = Overlook.components.navbar;
    document.getElementById('modal-root').innerHTML = Overlook.components.cancelModal;
    document.getElementById('app-content').innerHTML = viewOrder.map(id => Overlook.views[id]).join('\n');

    initCheckoutForm();
    initCancelFlow();
    initLoginForm();
    updateAuthUI();

    window.refreshOverlook = () => Promise.allSettled([renderRooms(), renderReservations()]);
    window.addEventListener('overlook:data-changed', () => refreshOverlook());
    window.addEventListener('overlook:auth-changed', () => {
        updateAuthUI();
        renderReservations();
    });
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') refreshOverlook();
    });

    const initial = (location.hash || '').replace(/^#\/?/, '').split('?')[0] || 'home';
    if (!location.hash) history.replaceState(null, '', '#/home');
    await navigate(initial);
    await refreshOverlook();
})();
