let cancelBusy = false;
window.openCancelModal = function(id) {
    if (cancelBusy) return;
    reservationToCancel = id;
    document.getElementById('cancel-modal').classList.remove('hidden');
};
window.closeCancelModal = function() {
    if (cancelBusy) return;
    reservationToCancel = null;
    document.getElementById('cancel-modal').classList.add('hidden');
};
window.initCancelFlow = function() {
    document.getElementById('confirm-cancel-btn').onclick = async function() {
        if (cancelBusy || !reservationToCancel) return;
        const id = reservationToCancel;
        cancelBusy = true;
        this.disabled = true;
        try {
            const user = getStoredUser();
            if (!user) throw new Error('Inicia sesión.');
            await Overlook.services.booking.cancel(id, user.email);
            cancelBusy = false;
            closeCancelModal();
            await renderReservations();
        } catch (error) { alert(error.message); }
        finally { cancelBusy = false; this.disabled = false; }
    };
};
