document.addEventListener('click', event => {
    const el = event.target.closest('[data-action]');
    if (!el) return;
    const action = el.dataset.action;
    if (action === 'toggle-nav') {
        toggleNavMenu();
    } else if (action === 'book') {
        startCheckout(el.dataset.roomId);
    } else if (action === 'logout') {
        Overlook.services.auth.logout();
        Overlook.flash('Sesión cerrada.', 'status');
        navigate('home');
    } else if (action === 'login-social') {
        const demo = Overlook.services.auth.DEMO[el.dataset.provider];
        if (demo) finishLogin(demo.email, demo.nombre);
    } else if (action === 'open-cancel') {
        openCancelModal(el.dataset.reservationId);
    } else if (action === 'close-cancel') {
        closeCancelModal();
    } else if (action === 'cancel-checkout') {
        Overlook.state.clearCheckout();
    } else if (action === 'copy-code') {
        const code = el.dataset.code || '';
        const done = () => Overlook.flash('Código copiado.', 'status');
        const show = () => Overlook.flash('Código completo: ' + code, 'status');
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(code).then(done).catch(show);
        } else show();
    }
});

document.addEventListener('error', event => {
    const img = event.target;
    if (!(img instanceof HTMLImageElement)) return;
    if (!img.closest('.room-photo')) return;
    img.hidden = true;
    img.parentElement.classList.add('room-image-fallback');
    const fallback = img.nextElementSibling;
    if (fallback) fallback.hidden = false;
}, true);
