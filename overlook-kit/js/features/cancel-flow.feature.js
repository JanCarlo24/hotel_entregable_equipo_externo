let cancelBusy = false;
let lastFocus = null;

function cancelDialog() {
    return document.getElementById('cancel-modal');
}

function setBackgroundInert(on) {
    ['navbar', 'app-content', 'site-footer'].forEach(id => {
        const node = document.getElementById(id);
        if (!node) return;
        if (on) node.setAttribute('inert', '');
        else node.removeAttribute('inert');
    });
}

function focusableIn(root) {
    return [...root.querySelectorAll('button:not([disabled]), a[href], input, select, textarea')];
}

function onModalKey(event) {
    const dialog = cancelDialog();
    if (!dialog || dialog.hidden) return;
    if (event.key === 'Escape') {
        event.preventDefault();
        closeCancelModal();
        return;
    }
    if (event.key !== 'Tab') return;
    const items = focusableIn(dialog);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    }
}

function hideModal() {
    const dialog = cancelDialog();
    dialog.hidden = true;
    dialog.classList.add('hidden');
    dialog.setAttribute('aria-hidden', 'true');
    setBackgroundInert(false);
    document.removeEventListener('keydown', onModalKey);
    const back = lastFocus;
    lastFocus = null;
    if (back && typeof back.focus === 'function') back.focus();
}

window.openCancelModal = function openCancelModal(id) {
    if (cancelBusy) return;
    Overlook.state.reservationToCancel = id;
    const dialog = cancelDialog();
    lastFocus = document.activeElement;
    dialog.hidden = false;
    dialog.classList.remove('hidden');
    dialog.setAttribute('aria-hidden', 'false');
    setBackgroundInert(true);
    document.addEventListener('keydown', onModalKey);
    const back = dialog.querySelector('[data-action="close-cancel"]');
    if (back) back.focus();
};

window.closeCancelModal = function closeCancelModal(force) {
    if (cancelBusy && !force) return;
    Overlook.state.reservationToCancel = null;
    hideModal();
};

window.initCancelFlow = function initCancelFlow() {
    const dialog = cancelDialog();
    dialog.addEventListener('click', event => {
        if (event.target === dialog) closeCancelModal();
    });
    document.getElementById('confirm-cancel-btn').addEventListener('click', async function onConfirm() {
        if (cancelBusy || !Overlook.state.reservationToCancel) return;
        const id = Overlook.state.reservationToCancel;
        cancelBusy = true;
        const back = cancelDialog().querySelector('[data-action="close-cancel"]');
        if (back) back.focus();
        this.disabled = true;
        try {
            const user = Overlook.services.auth.getStoredUser();
            if (!user) throw new Error('Inicia sesión para cancelar.');
            await Overlook.services.booking.cancel(id, user.email);
            cancelBusy = false;
            closeCancelModal(true);
            Overlook.flash('Reserva cancelada. La habitación volvió al inventario.', 'status');
        } catch (error) {
            cancelBusy = false;
            closeCancelModal(true);
            Overlook.flash(Overlook.userMessage(error, 'Esa reserva ya no está activa.'), 'alert');
            if (typeof renderReservations === 'function') await renderReservations();
        } finally {
            cancelBusy = false;
            this.disabled = false;
        }
    });
};
