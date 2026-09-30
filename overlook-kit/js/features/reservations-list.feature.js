let reservationsListComponent;
window.renderReservations = async function renderReservations() {
    const root = document.getElementById('reservations-list');
    reservationsListComponent ||= Overlook.components.asyncList.mount(root, {
        load: async () => {
            const user = Overlook.services.auth.getStoredUser();
            return user ? Overlook.services.booking.listReservations(user.email) : [];
        },
        render: reservation => Overlook.components.reservationCard(reservation),
        emptyHtml: '<div class="empty-state"><p>Aún no tienes reservas.</p><a class="luxury-button" href="#/rooms">Ver habitaciones</a></div>'
    });
    await reservationsListComponent.refresh();
};
