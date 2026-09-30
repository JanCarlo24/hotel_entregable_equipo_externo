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
        request.onblocked = () => reject(new Error('Cierra otras pestañas de Overlook e inténtalo de nuevo.'));
    });

    function transaction(mode, transform) {
        return ready.then(db => new Promise((resolve, reject) => {
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
        }));
    }

    function normalizeRoomId(roomId) {
        if (typeof roomId === 'number' && Number.isInteger(roomId)) return roomId;
        const text = String(roomId ?? '').trim();
        return /^\d+$/.test(text) ? Number(text) : roomId;
    }

    return {
        ready,
        listRooms: () => transaction('readonly', state => state.rooms),
        listReservations: email => transaction('readonly', state => state.reservations.filter(item => item.userEmail === email)),
        async book({ roomId, userEmail, checkin, checkout }) {
            const dates = Overlook.dates;
            const email = typeof userEmail === 'string' ? userEmail.trim() : '';
            if (!email) throw new Error('Inicia sesión para reservar.');
            const start = dates.parse(checkin);
            const end = dates.parse(checkout);
            if (!start || !end) throw new Error('Revisa las fechas de llegada y salida.');
            if (start < dates.today()) throw new Error('La llegada no puede ser anterior a hoy.');
            const nights = dates.nightsBetween(start, end);
            if (!nights || nights < 1) throw new Error('La salida debe ser posterior a la llegada.');
            if (nights > dates.MAX_NIGHTS) throw new Error('La estancia máxima es de ' + dates.MAX_NIGHTS + ' noches.');
            const horizon = dates.addDays(dates.today(), dates.MAX_ADVANCE_DAYS);
            if (start > horizon) throw new Error('Solo puedes reservar con hasta ' + dates.MAX_ADVANCE_DAYS + ' días de anticipación.');
            const id = normalizeRoomId(roomId);
            return transaction('readwrite', state => {
                const room = state.rooms.find(item => item.id === id);
                if (!room || room.qty <= 0) throw new Error('Esta habitación ya no tiene disponibilidad.');
                const reservation = {
                    id: 'RES-' + Overlook.createId(),
                    userEmail: email,
                    roomId: room.id,
                    roomName: room.name,
                    checkin: dates.toISO(start),
                    checkout: dates.toISO(end),
                    price: room.priceNum,
                    nights,
                    total: room.priceNum * nights
                };
                room.qty--;
                state.reservations.push(reservation);
                return reservation;
            });
        },
        cancel: (id, email) => transaction('readwrite', state => {
            const index = state.reservations.findIndex(item => item.id === id && item.userEmail === email);
            if (index < 0) throw new Error('La reserva ya fue cancelada o no pertenece a esta sesión.');
            const room = state.rooms.find(item => item.id === state.reservations[index].roomId);
            if (room) room.qty++;
            state.reservations.splice(index, 1);
        })
    };
})();
