Overlook.services = Overlook.services || {};
Overlook.services.booking = (() => {
    const changes = typeof BroadcastChannel === 'function'
        ? new BroadcastChannel('overlook-data-v1')
        : null;

    if (changes) {
        changes.addEventListener('message', event => {
            if (event.data === 'changed') window.dispatchEvent(new Event('overlook:data-changed'));
        });
    }

    async function request(path, options = {}) {
        const response = await fetch(path, {
            method: options.method || 'GET',
            headers: options.body === undefined ? undefined : { 'Content-Type': 'application/json' },
            body: options.body === undefined ? undefined : JSON.stringify(options.body)
        });
        let result;
        try {
            result = await response.json();
        } catch {
            throw new Error('El backend respondió con un formato no válido.');
        }
        if (!response.ok) {
            throw new Error(result && typeof result.error === 'string' ? result.error : `Error del backend (${response.status}).`);
        }
        return result;
    }

    function notifyChange() {
        window.dispatchEvent(new Event('overlook:data-changed'));
        if (changes) changes.postMessage('changed');
    }

    return {
        ready: request('/api/health').then(result => {
            if (!result || result.status !== 'ok') throw new Error('El backend local no está disponible.');
        }),
        listRooms: () => request('/api/rooms'),
        listReservations: email => request(`/api/reservations?email=${encodeURIComponent(email || '')}`),
        async book(input) {
            const reservation = await request('/api/reservations', { method: 'POST', body: input });
            notifyChange();
            return reservation;
        },
        async cancel(id, email) {
            const result = await request(`/api/reservations/${encodeURIComponent(id)}`, {
                method: 'DELETE',
                body: { userEmail: email }
            });
            notifyChange();
            return result;
        }
    };
})();
