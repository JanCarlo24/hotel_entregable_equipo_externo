const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { createFileStore } = require('../../backend/file-store.cjs');
const { startTestServer } = require('./server-fixture.cjs');

function client(base) {
    const context = vm.createContext({
        Event,
        fetch: (input, options) => fetch(new URL(input, base), options),
        Overlook: { services: {} },
        window: { dispatchEvent() {} }
    });
    const servicePath = path.join(__dirname, '..', 'js', 'services', 'booking.service.js');
    vm.runInContext(fs.readFileSync(servicePath, 'utf8'), context);
    return context.Overlook.services.booking;
}

function iso(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

(async () => {
    const fixture = await startTestServer();
    try {
        const a = client(fixture.base);
        const b = client(fixture.base);
        await Promise.all([a.ready, b.ready]);
        const input = { roomId: 3, userEmail: 'test@example.com', checkin: iso(10), checkout: iso(12) };
        const attempts = await Promise.allSettled(Array.from({ length: 10 }, (_, index) => (index % 2 ? a : b).book(input)));
        assert.equal(attempts.filter(result => result.status === 'fulfilled').length, 2);

        const rooms = await a.listRooms();
        assert.equal(rooms.find(room => room.id === 3).qty, 0);
        const reservation = attempts.find(result => result.status === 'fulfilled').value;
        assert.equal(reservation.nights, 2);
        assert.equal(reservation.total, 7980);
        assert.equal((await a.listReservations('TEST@example.com')).length, 2);

        const cancellations = await Promise.allSettled([
            a.cancel(reservation.id, input.userEmail),
            b.cancel(reservation.id, input.userEmail)
        ]);
        assert.equal(cancellations.filter(result => result.status === 'fulfilled').length, 1);
        assert.equal((await a.listRooms()).find(room => room.id === 3).qty, 1);

        await assert.rejects(a.book({ ...input, checkout: input.checkin }), /posterior/);
        await assert.rejects(a.book({ ...input, checkout: iso(41) }), /30 noches/);
        await assert.rejects(a.book({ ...input, checkin: iso(400), checkout: iso(402) }), /365 días/);
        await assert.rejects(a.cancel('RES-inexistente', input.userEmail), /no está activa|no pertenece/);

        const invalidEmail = await fetch(`${fixture.base}/api/reservations?email=not-an-email`);
        assert.equal(invalidEmail.status, 400);
        const malformed = await fetch(`${fixture.base}/api/reservations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: '{mal JSON'
        });
        assert.equal(malformed.status, 400);
        assert.equal((await fetch(fixture.base)).status, 200);

        const persisted = createFileStore(fixture.dataFile);
        await persisted.initialize();
        assert.equal((await persisted.read()).rooms.find(room => room.id === 3).qty, 1);

        let oldResolve;
        let calls = 0;
        const root = { textContent: '', innerHTML: '', setAttribute() {}, replaceChildren() { this.textContent = ''; } };
        const asyncListPath = path.join(__dirname, '..', 'js', 'components', 'async-list.component.js');
        const componentContext = vm.createContext({ Overlook: { components: {} } });
        vm.runInContext(fs.readFileSync(asyncListPath, 'utf8'), componentContext);
        const list = componentContext.Overlook.components.asyncList.mount(root, {
            load: () => ++calls === 1 ? new Promise(resolve => { oldResolve = resolve; }) : Promise.resolve(['nuevo']),
            render: value => value
        });
        const old = list.refresh();
        await list.refresh();
        oldResolve(['viejo']);
        await old;
        assert.equal(root.innerHTML, 'nuevo');

        console.log('OK: API local, concurrencia sin sobreventa, cancelación atómica, validación, persistencia JSON y respuestas asíncronas.');
    } finally {
        await fixture.close();
    }
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
