Overlook.state = {
    roomToBook: null,
    reservationToCancel: null,
    clearCheckout() {
        this.roomToBook = null;
    },
    reset() {
        this.roomToBook = null;
        this.reservationToCancel = null;
    }
};
