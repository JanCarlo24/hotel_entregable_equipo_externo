let roomsListComponent;
window.renderRooms = async function() {
    roomsListComponent ||= Overlook.components.asyncList.mount(document.getElementById('rooms-container'), {
        load: () => Overlook.services.booking.listRooms(),
        render: room => Overlook.components.roomCard(Overlook.safeRecord(room))
    });
    await roomsListComponent.refresh();
};
