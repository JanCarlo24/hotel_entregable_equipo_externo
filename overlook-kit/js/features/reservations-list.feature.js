let reservationsListComponent;
window.renderReservations = async function() {
    reservationsListComponent ||= Overlook.components.asyncList.mount(document.getElementById('reservations-list'), {
        load: async () => {
            const user = JSON.parse(localStorage.getItem('overlook_user'));
            return user ? Overlook.services.booking.listReservations(user.email) : [];
        },
        render: res => Overlook.components.reservationCard(Overlook.safeRecord(res)),
        empty: 'No tienes reservaciones activas.'
    });
    await reservationsListComponent.refresh();
};
