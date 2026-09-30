// Ejecutar con Playwright disponible: node tests/concurrency.cjs
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
    const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined });
    const context = await browser.newContext();
    const page = await context.newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    const base = process.env.OVERLOOK_URL || 'http://localhost:8765';
    await page.goto(base);
    await page.waitForFunction(() => typeof window.refreshOverlook === 'function');
    const next = await page.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 2); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); });
    const end = await page.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 3); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); });
    const other = await context.newPage(); await other.goto(base);
    await other.waitForFunction(() => typeof window.refreshOverlook === 'function');
    const input = { roomId: 3, userEmail: 'test@example.com', checkin: next, checkout: end };
    const results = await Promise.all([page, other].map(p => p.evaluate(async input => Promise.allSettled(Array.from({ length: 5 }, () => Overlook.services.booking.book(input))).then(rs => rs.map(r => ({ status: r.status, id: r.value?.id }))), input)));
    const flat = results.flat(); assert.equal(flat.filter(r => r.status === 'fulfilled').length, 2);
    assert.equal(await page.evaluate(async () => (await Overlook.services.booking.listRooms()).find(r => r.id === 3).qty), 0);
    const id = flat.find(r => r.id).id;
    const cancel = await page.evaluate(async id => (await Promise.allSettled([Overlook.services.booking.cancel(id, 'test@example.com'), Overlook.services.booking.cancel(id, 'test@example.com')])).map(r => r.status), id);
    assert.deepEqual(cancel.sort(), ['fulfilled', 'rejected']);
    assert.equal(await page.evaluate(async () => (await Overlook.services.booking.listRooms()).find(r => r.id === 3).qty), 1);
    // A slow old response must not replace the newest result.
    assert.equal(await page.evaluate(async () => {
        const root = document.createElement('div'); let count = 0, resolveOld;
        const list = Overlook.components.asyncList.mount(root, { load: () => ++count === 1 ? new Promise(r => resolveOld = r) : Promise.resolve(['nuevo']), render: x => x });
        const a = list.refresh(); await list.refresh(); resolveOld(['viejo']); await a; return root.textContent;
    }), 'nuevo');
    await page.evaluate(() => startCheckout(1));
    await page.waitForFunction(() => !document.getElementById('view-login').classList.contains('hidden'));
    await page.locator('#view-login input').fill('demo@example.com');
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    await page.waitForFunction(() => !document.getElementById('view-checkout').classList.contains('hidden'));
    await page.locator('input[placeholder="1234 5678 9101 1121"]').fill('1234 5678 1234 5678');
    await page.locator('input[placeholder="MM/YY"]').fill('12/30');
    await page.locator('input[placeholder="123"]').fill('123');
    await page.getByRole('button', { name: 'Confirmar y Pagar' }).click();
    await page.waitForFunction(() => !document.getElementById('view-reservations').classList.contains('hidden'));
    await page.waitForFunction(() => document.getElementById('reservations-list').textContent.includes('De Luxe Room'));
    assert.deepEqual(errors, []);
    console.log('OK: reservas entre pestañas, inventario, cancelación doble, respuestas fuera de orden y flujo login/reserva.');
    await browser.close();
})().catch(e => { console.error(e); process.exit(1) });
