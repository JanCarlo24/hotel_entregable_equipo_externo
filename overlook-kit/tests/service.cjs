const { indexedDB } = require('fake-indexeddb');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const webcrypto = require('node:crypto').webcrypto;
function client(cryptoImpl) {
    const context = vm.createContext({ indexedDB, crypto: cryptoImpl || webcrypto, console, Event, window: { dispatchEvent() { }, scrollY: 0 }, Overlook: { components: {} } });
    for (const file of ['js/core/id.js', 'js/core/dates.js', 'js/data/rooms.data.js', 'js/services/booking.service.js', 'js/components/async-list.component.js']) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context);
    return context;
}
function iso(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}
function loadId(cryptoImpl) {
    const context = vm.createContext({ crypto: cryptoImpl, Overlook: {} });
    vm.runInContext(fs.readFileSync(path.join(root, 'js/core/id.js'), 'utf8'), context);
    return context.Overlook.createId();
}
(async () => {
    const a = client(), b = client(); await Promise.all([a.Overlook.services.booking.ready, b.Overlook.services.booking.ready]);
    const input = { roomId: 3, userEmail: 'test@example.com', checkin: iso(10), checkout: iso(12) };
    const attempts = await Promise.allSettled(Array.from({ length: 10 }, (_, i) => (i % 2 ? a : b).Overlook.services.booking.book(input)));
    assert.equal(attempts.filter(x => x.status === 'fulfilled').length, 2);
    const rooms = await a.Overlook.services.booking.listRooms(); assert.equal(rooms.find(r => r.id === 3).qty, 0);
    const res = attempts.find(r => r.status === 'fulfilled').value; assert.equal(res.nights, 2); assert.equal(res.total, 7980);
    const cancellations = await Promise.allSettled([a, b].map(c => c.Overlook.services.booking.cancel(res.id, input.userEmail)));
    assert.equal(cancellations.filter(x => x.status === 'fulfilled').length, 1);
    assert.equal((await a.Overlook.services.booking.listRooms()).find(r => r.id === 3).qty, 1);
    await assert.rejects(a.Overlook.services.booking.book({ ...input, checkout: input.checkin }));
    await assert.rejects(a.Overlook.services.booking.book({ ...input, checkout: iso(10 + 31) }), /30 noches/);
    await assert.rejects(a.Overlook.services.booking.book({ ...input, checkin: iso(400), checkout: iso(402) }), /365 días/);
    assert.match(loadId(webcrypto), /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    assert.match(loadId({ getRandomValues: bytes => webcrypto.getRandomValues(bytes) }), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    assert.ok(loadId(undefined));
    const insecure = client({ getRandomValues: bytes => webcrypto.getRandomValues(bytes) });
    await insecure.Overlook.services.booking.ready;
    const fallbackReservation = await insecure.Overlook.services.booking.book({ roomId: 1, userEmail: 'id@example.com', checkin: iso(4), checkout: iso(6) });
    assert.match(fallbackReservation.id, /^RES-[0-9a-f]{8}-/i);
    await assert.rejects(a.Overlook.services.booking.cancel(attempts.filter(r => r.status === 'fulfilled')[1].value.id, 'other@example.com'));
    let oldResolve, calls = 0; const root = { textContent: '', innerHTML: '', setAttribute() { }, replaceChildren() { this.textContent = '' } };
    const component = a.Overlook.components.asyncList.mount(root, { load: () => ++calls === 1 ? new Promise(r => oldResolve = r) : Promise.resolve(['nuevo']), render: x => x });
    const old = component.refresh(); await component.refresh(); oldResolve(['viejo']); await old; assert.equal(root.innerHTML, 'nuevo');
    let finish; const removed = a.Overlook.components.asyncList.mount(root, { load: () => new Promise(r => finish = r), render: x => x });
    const pending = removed.refresh(); removed.destroy(); finish(['ignorado']); await pending; assert.equal(root.textContent, '');
    console.log('OK: 10 solicitudes / 2 conexiones; sin sobreventa; cancelación idempotente en inventario; fechas; titularidad; total; respuestas obsoletas; desmontaje.');
})().catch(e => { console.error(e); process.exitCode = 1 });
