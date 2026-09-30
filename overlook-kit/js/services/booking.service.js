/* Adaptador local asíncrono. Una transacción IndexedDB guarda inventario y
   reservas juntos. Las escrituras concurrentes se serializan entre pestañas. */
Overlook.services = Overlook.services || {};
Overlook.services.booking = (() => {
    const ready = new Promise((resolve, reject) => {
        const request = indexedDB.open('overlook-async-v1', 1);
        request.onupgradeneeded = () => {
            const store = request.result.createObjectStore('state');
            store.put({ rooms: defaultRooms, reservations: [] }, 'hotel');
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error('Cierra otras versiones abiertas de Overlook.'));
    });
    async function transaction(mode, transform) {
        const db = await ready;
        return new Promise((resolve, reject) => {
            const tx = db.transaction('state', mode);
            const store = tx.objectStore('state');
            const read = store.get('hotel');
            let result, failure;
            read.onsuccess = () => {
                try {
                    result = transform(read.result);
                    if (mode === 'readwrite') store.put(read.result, 'hotel');
                } catch (error) { failure = error; tx.abort(); }
            };
            tx.oncomplete = () => {
                if (mode === 'readwrite') window.dispatchEvent(new Event('overlook:data-changed'));
                resolve(result);
            };
            tx.onabort = tx.onerror = () => reject(failure || tx.error || new Error('No se pudo guardar.'));
        });
    }
    return {
        ready,
        listRooms: () => transaction('readonly', s => s.rooms),
        listReservations: email => transaction('readonly', s => s.reservations.filter(r => r.userEmail === email)),
        async book({ roomId, userEmail, checkin, checkout }) {
            const today = new Date();
            const localToday = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
            const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
            if (!userEmail || !validDate(checkin) || !validDate(checkout) || checkin < localToday || checkout <= checkin) throw new Error('Revisa la sesión y las fechas de llegada y salida.');
            return transaction('readwrite', s => {
                const room = s.rooms.find(r => r.id === roomId);
                if (!room || room.qty <= 0) throw new Error('Esta habitación ya no tiene disponibilidad.');
                const nights = Math.round((Date.parse(checkout)-Date.parse(checkin))/86400000);
                const reservation = { id: 'RES-' + crypto.randomUUID(), userEmail, roomId, roomName: room.name, checkin, checkout, price: room.price, nights, total: room.priceNum * nights };
                room.qty--;
                s.reservations.push(reservation);
                return reservation;
            });
        },
        cancel: (id, email) => transaction('readwrite', s => {
            const index = s.reservations.findIndex(r => r.id === id && r.userEmail === email);
            if (index < 0) throw new Error('La reserva ya fue cancelada o no pertenece a esta sesión.');
            const room = s.rooms.find(r => r.id === s.reservations[index].roomId);
            if (room) room.qty++;
            s.reservations.splice(index, 1);
        })
    };
})();
