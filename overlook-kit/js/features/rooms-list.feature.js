let roomsListComponent;
window.renderRooms = async function renderRooms() {
    const root = document.getElementById('rooms-container');
    roomsListComponent ||= Overlook.components.asyncList.mount(root, {
        load: () => Overlook.services.booking.listRooms(),
        render: room => Overlook.components.roomCard(room),
        empty: 'No hay habitaciones para mostrar.'
    });
    await roomsListComponent.refresh();
};
