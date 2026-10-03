// Recorrido de la auditoría: reservas, login, hash, modal, responsive, CDN y XSS.
const { chromium } = require('playwright');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { startTestServer } = require('./server-fixture.cjs');
let base;
let fixture;
let browser;
const results = [];

function pass(id, name) {
    results.push({ id, name, ok: true });
    console.log('PASS', id, name);
}
function fail(id, name, error) {
    results.push({ id, name, ok: false, error: String(error && error.message || error) });
    console.error('FAIL', id, name, error && error.message || error);
}

async function scenario(id, name, fn) {
    try { await fn(); pass(id, name); }
    catch (error) { fail(id, name, error); }
}

function track(page, bucket) {
    page.on('pageerror', error => bucket.push('pageerror: ' + error.message));
    page.on('console', msg => {
        if (msg.type() !== 'error') return;
        const text = msg.text();
        if (/cdn\.tailwindcss\.com/i.test(text)) return;
        bucket.push(text);
    });
}

async function ready(page) {
    await page.goto(base + '/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.refreshOverlook === 'function');
    await page.waitForFunction(() => (document.getElementById('rooms-container') || {}).textContent.includes('De Luxe Room'));
}

async function login(page, email) {
    await page.evaluate(() => navigate('login'));
    await page.waitForFunction(() => location.hash === '#/login');
    await page.fill('#login-email', email);
    await page.locator('#login-form button[type=submit]').click();
    await page.waitForFunction(() => location.hash === '#/rooms' || location.hash === '#/checkout');
}

async function fillCard(page, number = '1234 5678 1234 5678', exp = '12/30', cvv = '123') {
    await page.fill('#card-number', number);
    await page.fill('#card-exp', exp);
    await page.fill('#card-cvv', cvv);
}

async function openCheckout(page, roomId, email) {
    await page.evaluate(id => startCheckout(id), roomId);
    await page.waitForFunction(() => ['#/login', '#/checkout', '#/rooms'].includes(location.hash));
    if (await page.evaluate(() => location.hash === '#/login')) {
        await page.fill('#login-email', email);
        await page.locator('#login-form button[type=submit]').click();
        await page.waitForFunction(() => location.hash === '#/checkout' || location.hash === '#/rooms');
    }
}

async function overflow(page) {
    return page.evaluate(() => {
        const doc = document.documentElement;
        const offenders = [];
        for (const el of document.body.querySelectorAll('*')) {
            if (el.closest('[hidden], .hidden')) continue;
            const rect = el.getBoundingClientRect();
            if (rect.width < 2 || rect.height < 2) continue;
            if (rect.right > window.innerWidth + 1 || rect.left < -1) {
                offenders.push((el.id || el.className || el.tagName).toString().slice(0, 80));
            }
        }
        return { scroll: doc.scrollWidth - doc.clientWidth, offenders: offenders.slice(0, 6) };
    });
}

(async () => {
    fixture = await startTestServer();
    base = fixture.base;
    browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined });
    const consoleAll = [];

    await scenario('01 reserva normal', 'reserva con tarjeta válida y aviso demo', async () => {
        const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page = await context.newPage();
        const errors = []; track(page, errors);
        await ready(page);
        await openCheckout(page, 1, 'normal@overlook.test');
        if (await page.evaluate(() => location.hash) !== '#/checkout') throw new Error('no llegó al checkout');
        const notice = await page.locator('text=Demo: no ingreses datos reales de tarjeta.').textContent();
        if (!notice.includes('Demo: no ingreses datos reales de tarjeta.')) throw new Error(notice);
        await fillCard(page, 'abcd', 'zz', 'x');
        await page.locator('#checkout-form button[type=submit]').click();
        await page.waitForFunction(() => document.getElementById('checkout-error').textContent.length > 0);
        if (await page.evaluate(() => location.hash) !== '#/checkout') throw new Error('la tarjeta inválida reservó');
        await fillCard(page);
        await page.locator('#checkout-form button[type=submit]').click();
        await page.waitForFunction(() => location.hash === '#/reservations' && document.body.innerText.includes('De Luxe Room'));
        const leak = await page.evaluate(async () => JSON.stringify(localStorage) + JSON.stringify(await Overlook.services.booking.listReservations('normal@overlook.test')));
        if (leak.includes('5678')) throw new Error('se guardó la tarjeta');
        if (!await page.evaluate(() => document.getElementById('flash-status').textContent.includes('confirmada'))) throw new Error('sin confirmación');
        consoleAll.push(...errors);
        await context.close();
    });

    await scenario('02 sin disponibilidad', 'habitación agotada no abre checkout', async () => {
        const context = await browser.newContext();
        const page = await context.newPage();
        const errors = []; track(page, errors);
        await ready(page);
        await page.evaluate(async () => {
            const dates = Overlook.dates;
            const stay = { userEmail: 'agotada@overlook.test', checkin: dates.toISO(dates.addDays(dates.today(), 6)), checkout: dates.toISO(dates.addDays(dates.today(), 8)) };
            await Overlook.services.booking.book({ ...stay, roomId: 3 });
            await Overlook.services.booking.book({ ...stay, roomId: 3 });
        });
        await page.evaluate(() => navigate('rooms'));
        await page.evaluate(() => startCheckout(3));
        await page.waitForFunction(() => document.getElementById('flash-alert').textContent.includes('disponibilidad'));
        const hash = await page.evaluate(() => location.hash);
        if (hash !== '#/rooms') throw new Error(hash);
        const reservations = await page.evaluate(() => Overlook.services.booking.listReservations('agotada@overlook.test'));
        await Promise.all(reservations.map(reservation => page.evaluate(
            item => Overlook.services.booking.cancel(item.id, item.userEmail),
            reservation
        )));
        consoleAll.push(...errors);
        await context.close();
    });

    await scenario('03 dos reservas simultáneas', 'solo dos éxitos con dos unidades', async () => {
        const context = await browser.newContext();
        const page = await context.newPage();
        const other = await context.newPage();
        await ready(page); await ready(other);
        const input = await page.evaluate(() => {
            const dates = Overlook.dates;
            return { roomId: 3, userEmail: 'sim@overlook.test', checkin: dates.toISO(dates.addDays(dates.today(), 9)), checkout: dates.toISO(dates.addDays(dates.today(), 11)) };
        });
        const results = await Promise.all([page, other].map(p => p.evaluate(async input => {
            const all = await Promise.allSettled(Array.from({ length: 5 }, () => Overlook.services.booking.book(input)));
            return all.filter(item => item.status === 'fulfilled').length;
        }, input)));
        const ok = results[0] + results[1];
        if (ok !== 2) throw new Error('éxitos ' + ok);
        const qty = await page.evaluate(async () => (await Overlook.services.booking.listRooms()).find(room => room.id === 3).qty);
        if (qty !== 0) throw new Error('qty ' + qty);
        await context.close();
    });

    await scenario('04 cancelación', 'el modal cancela y quita la tarjeta', async () => {
        const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page = await context.newPage();
        await ready(page);
        await page.evaluate(async () => {
            const dates = Overlook.dates;
            await Overlook.services.auth.login({ email: 'cancela@overlook.test', nombre: 'Cancela' });
            await Overlook.services.booking.book({ roomId: 1, userEmail: 'cancela@overlook.test', checkin: dates.toISO(dates.addDays(dates.today(), 3)), checkout: dates.toISO(dates.addDays(dates.today(), 5)) });
        });
        await page.evaluate(() => navigate('reservations'));
        await page.waitForFunction(() => document.body.innerText.includes('De Luxe Room'));
        await page.locator('[data-action="open-cancel"]').click();
        await page.waitForFunction(() => !document.getElementById('cancel-modal').hidden);
        await page.locator('#confirm-cancel-btn').click();
        await page.waitForFunction(() => document.getElementById('flash-status').textContent.includes('cancelada') && !document.body.innerText.includes('De Luxe Room'));
        await context.close();
    });

    await scenario('05 doble cancelación', 'la segunda falla y el inventario no sube dos veces', async () => {
        const context = await browser.newContext();
        const page = await context.newPage();
        await ready(page);
        const summary = await page.evaluate(async () => {
            const dates = Overlook.dates;
            const before = (await Overlook.services.booking.listRooms()).find(room => room.id === 2).qty;
            const reservation = await Overlook.services.booking.book({ roomId: 2, userEmail: 'doble@overlook.test', checkin: dates.toISO(dates.addDays(dates.today(), 4)), checkout: dates.toISO(dates.addDays(dates.today(), 6)) });
            const both = await Promise.allSettled([
                Overlook.services.booking.cancel(reservation.id, 'doble@overlook.test'),
                Overlook.services.booking.cancel(reservation.id, 'doble@overlook.test')
            ]);
            const after = (await Overlook.services.booking.listRooms()).find(room => room.id === 2).qty;
            return { fulfilled: both.filter(item => item.status === 'fulfilled').length, before, after };
        });
        if (summary.fulfilled !== 1 || summary.after !== summary.before) throw new Error(JSON.stringify(summary));
        await context.close();
    });

    await scenario('06 login válido', 'correo válido entra a habitaciones', async () => {
        const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page = await context.newPage();
        await ready(page);
        await login(page, 'valido@overlook.test');
        const state = await page.evaluate(() => ({ hash: location.hash, email: Overlook.services.auth.getStoredUser().email, label: document.querySelector('label[for="login-email"]') !== null }));
        if (state.hash !== '#/rooms' || state.email !== 'valido@overlook.test' || !state.label) throw new Error(JSON.stringify(state));
        await context.close();
    });

    await scenario('07 login inválido', 'vacío o mal formado no crea sesión', async () => {
        const context = await browser.newContext();
        const page = await context.newPage();
        await ready(page);
        await page.evaluate(() => navigate('login'));
        await page.locator('#login-form button[type=submit]').click();
        await page.waitForFunction(() => document.getElementById('login-error').textContent.length > 0);
        await page.fill('#login-email', 'no-es-correo');
        await page.locator('#login-form button[type=submit]').click();
        const user = await page.evaluate(() => Overlook.services.auth.getStoredUser());
        const hash = await page.evaluate(() => location.hash);
        if (user || hash !== '#/login') throw new Error(hash + ' ' + JSON.stringify(user));
        await context.close();
    });

    await scenario('08 Enter en login', 'Enter envía el formulario', async () => {
        const context = await browser.newContext();
        const page = await context.newPage();
        await ready(page);
        await page.evaluate(() => navigate('login'));
        await page.fill('#login-email', 'enter@overlook.test');
        await page.locator('#login-email').press('Enter');
        await page.waitForFunction(() => location.hash === '#/rooms' && Overlook.services.auth.getStoredUser() && Overlook.services.auth.getStoredUser().email === 'enter@overlook.test');
        await context.close();
    });

    await scenario('09 logout', 'cierra sesión y vuelve a inicio', async () => {
        const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page = await context.newPage();
        await ready(page);
        await login(page, 'sale@overlook.test');
        await page.locator('#nav-logout').click();
        await page.waitForFunction(() => location.hash === '#/home' && !localStorage.getItem('overlook_user'));
        const loginVisible = await page.locator('#nav-login').isVisible();
        if (!loginVisible) throw new Error('falta Iniciar sesión');
        await context.close();
    });

    await scenario('10 cambio de usuario', 'la selección de otro usuario no sobrevive', async () => {
        const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page = await context.newPage();
        await ready(page);
        await login(page, 'ana@overlook.test');
        await openCheckout(page, 1, 'ana@overlook.test');
        if (await page.evaluate(() => location.hash) !== '#/checkout') throw new Error('ana no llegó al checkout');
        await page.locator('#nav-logout').click();
        await page.waitForFunction(() => location.hash === '#/home');
        await login(page, 'bruno@overlook.test');
        const state = await page.evaluate(() => ({ hash: location.hash, room: Overlook.state.roomToBook }));
        if (state.hash === '#/checkout' || state.room) throw new Error(JSON.stringify(state));
        await context.close();
    });

    await scenario('11-16 fechas de checkout', 'total en vivo, 1 noche, varias noches, inválida, límite y horizonte', async () => {
        const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
        const page = await context.newPage();
        await ready(page);
        await openCheckout(page, 1, 'fechas@overlook.test');
        await page.waitForFunction(() => location.hash === '#/checkout');
        const initial = await page.locator('#checkout-math').textContent();
        if (!initial.includes('1 noche') || !initial.includes('$1,890 MXN')) throw new Error('12 ' + initial);
        pass('12 una noche', initial.trim());
        const changed = await page.evaluate(() => {
            const dates = Overlook.dates;
            const input = document.getElementById('checkout-date');
            input.value = dates.toISO(dates.addDays(dates.today(), 4));
            input.dispatchEvent(new Event('input', { bubbles: true }));
            return document.getElementById('checkout-math').textContent;
        });
        if (!changed.includes('4 noches') || !changed.includes('$7,560 MXN')) throw new Error('11/13 ' + changed);
        pass('11 fechas distintas', changed.trim());
        pass('13 varias noches', changed.trim());
        await page.evaluate(() => {
            const day = Overlook.dates.toISO(Overlook.dates.today());
            document.getElementById('checkin-date').value = day;
            document.getElementById('checkout-date').value = day;
        });
        await fillCard(page);
        await page.locator('#checkout-form button[type=submit]').click();
        await page.waitForFunction(() => /posterior|válid/.test(document.getElementById('checkout-error').textContent));
        const none = await page.evaluate(() => Overlook.services.booking.listReservations('fechas@overlook.test').then(list => list.length));
        if (none !== 0 || await page.evaluate(() => location.hash) !== '#/checkout') throw new Error('14 reservó con fecha inválida');
        pass('14 fecha inválida', 'rechazada');
        const cleared = await page.evaluate(() => {
            const input = document.getElementById('checkin-date');
            input.value = '';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            return document.getElementById('checkout-date').min + ' ' + document.getElementById('checkout-math').textContent;
        });
        if (cleared.includes('NaN')) throw new Error(cleared);
        await page.evaluate(() => {
            const dates = Overlook.dates;
            document.getElementById('checkin-date').value = dates.toISO(dates.today());
            document.getElementById('checkout-date').value = dates.toISO(dates.addDays(dates.today(), 31));
            document.getElementById('checkin-date').dispatchEvent(new Event('change', { bubbles: true }));
        });
        await fillCard(page);
        await page.locator('#checkout-form button[type=submit]').click();
        await page.waitForFunction(() => document.getElementById('checkout-error').textContent.includes('30 noches') || document.getElementById('checkout-math').textContent.includes('30 noches'));
        if (await page.evaluate(() => Overlook.services.booking.listReservations('fechas@overlook.test').then(list => list.length)) !== 0) throw new Error('15 reservó de más');
        pass('15 estancia > límite', '30 noches');
        await page.evaluate(() => {
            const dates = Overlook.dates;
            document.getElementById('checkin-date').value = dates.toISO(dates.addDays(dates.today(), 366));
            document.getElementById('checkout-date').value = dates.toISO(dates.addDays(dates.today(), 368));
        });
        await fillCard(page);
        await page.locator('#checkout-form button[type=submit]').click();
        await page.waitForFunction(() => document.getElementById('checkout-error').textContent.includes('365'));
        if (await page.evaluate(() => Overlook.services.booking.listReservations('fechas@overlook.test').then(list => list.length)) !== 0) throw new Error('16 reservó fuera de horizonte');
        pass('16 fecha > horizonte', '365 días');
        await context.close();
    });

    await scenario('17 navegación hash', 'enlaces, regreso protegido y deep link', async () => {
        const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page = await context.newPage();
        await ready(page);
        await page.click('[data-nav="about"]');
        await page.waitForFunction(() => location.hash === '#/about' && !document.getElementById('view-about').hidden);
        await page.click('[data-nav="rooms"]');
        await page.waitForFunction(() => location.hash === '#/rooms' && document.querySelector('[data-nav="rooms"]').getAttribute('aria-current') === 'page');
        await page.locator('a.logo').focus();
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => location.hash === '#/home');
        await page.evaluate(() => navigate('reservations'));
        await page.waitForFunction(() => location.hash === '#/login');
        await page.evaluate(() => navigate('checkout'));
        await page.waitForFunction(() => location.hash === '#/rooms');
        await context.close();
    });

    await scenario('18 atrás y adelante', 'el historial conserva las vistas', async () => {
        const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page = await context.newPage();
        await ready(page);
        await page.goto(base + '/#/home', { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => location.hash === '#/home');
        await page.click('[data-nav="about"]');
        await page.waitForFunction(() => location.hash === '#/about');
        await page.click('[data-nav="rooms"]');
        await page.waitForFunction(() => location.hash === '#/rooms');
        await page.goBack();
        await page.waitForFunction(() => location.hash === '#/about' && !document.getElementById('view-about').hidden);
        await page.goForward();
        await page.waitForFunction(() => location.hash === '#/rooms' && !document.getElementById('view-rooms').hidden);
        await context.close();
    });

    await scenario('19 recarga en cada ruta', 'el hash sobrevive al refresh y las rutas protegidas redirigen', async () => {
        const context = await browser.newContext();
        const page = await context.newPage();
        for (const route of ['home', 'about', 'rooms', 'login']) {
            await page.goto(base + '/#/' + route, { waitUntil: 'domcontentloaded' });
            await page.reload({ waitUntil: 'domcontentloaded' });
            await page.waitForFunction(id => location.hash === '#/' + id && !document.getElementById('view-' + id).hidden, route);
        }
        await page.goto(base + '/#/reservations', { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => location.hash === '#/login');
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => location.hash === '#/login');
        await page.goto(base + '/#/checkout', { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => location.hash === '#/rooms');
        await page.evaluate(() => Overlook.services.auth.login({ email: 'recarga@overlook.test', nombre: 'Recarga' }));
        await page.goto(base + '/#/reservations', { waitUntil: 'domcontentloaded' });
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => location.hash === '#/reservations' && !document.getElementById('view-reservations').hidden);
        await context.close();
    });

    await scenario('20-21 modal', 'Escape, foco y Tab se quedan en el diálogo', async () => {
        const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page = await context.newPage();
        await ready(page);
        await page.evaluate(async () => {
            const dates = Overlook.dates;
            await Overlook.services.auth.login({ email: 'modal@overlook.test', nombre: 'Modal' });
            await Overlook.services.booking.book({ roomId: 1, userEmail: 'modal@overlook.test', checkin: dates.toISO(dates.addDays(dates.today(), 2)), checkout: dates.toISO(dates.addDays(dates.today(), 4)) });
            await navigate('reservations');
        });
        await page.waitForFunction(() => document.querySelector('[data-action="open-cancel"]'));
        await page.locator('[data-action="open-cancel"]').focus();
        await page.locator('[data-action="open-cancel"]').click();
        await page.waitForFunction(() => !document.getElementById('cancel-modal').hidden);
        const dialog = await page.evaluate(() => {
            const node = document.getElementById('cancel-modal');
            return { role: node.getAttribute('role'), modal: node.getAttribute('aria-modal'), labelled: !!document.getElementById(node.getAttribute('aria-labelledby')) };
        });
        if (dialog.role !== 'dialog' || dialog.modal !== 'true' || !dialog.labelled) throw new Error(JSON.stringify(dialog));
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        const trapped = await page.evaluate(() => !!document.activeElement.closest('#cancel-modal'));
        await page.keyboard.press('Shift+Tab');
        const trappedBack = await page.evaluate(() => !!document.activeElement.closest('#cancel-modal'));
        if (!trapped || !trappedBack) throw new Error('el foco salió del modal');
        pass('21 Tab en el modal', 'foco contenido');
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => document.getElementById('cancel-modal').hidden);
        const restored = await page.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-action'));
        if (restored !== 'open-cancel') throw new Error('foco restaurado: ' + restored);
        pass('20 Escape cierra el modal', 'foco restaurado');
        await context.close();
    });

    const widths = [[320, 700], [375, 812], [768, 1024], [1280, 800], [360, 740], [390, 844], [414, 896], [740, 360], [820, 1180], [900, 1100], [1024, 800]];
    await scenario('22-25 responsive', 'sin desborde horizontal en las vistas pedidas', async () => {
        const context = await browser.newContext();
        const page = await context.newPage();
        await ready(page);
        await login(page, 'ancho@overlook.test');
        await openCheckout(page, 2, 'ancho@overlook.test');
        const problems = [];
        for (const [width, height] of widths) {
            await page.setViewportSize({ width, height });
            for (const route of ['home', 'about', 'rooms', 'login', 'checkout', 'reservations']) {
                await page.evaluate(id => navigate(id === 'checkout' ? 'checkout' : id), route);
                if (route === 'checkout') await page.evaluate(() => startCheckout(2));
                await page.waitForTimeout(80);
                const box = await overflow(page);
                if (box.scroll > 1 || box.offenders.length) problems.push(width + 'x' + height + ' ' + route + ' ' + JSON.stringify(box));
            }
            await page.evaluate(() => navigate('home'));
            const closedBar = await page.evaluate(() => document.getElementById('navbar').getBoundingClientRect().height);
            if (closedBar > 96) problems.push(width + ' navbar alta ' + closedBar);
            if (width < 1024) {
                await page.locator('#nav-toggle').click();
                const menu = await page.evaluate(() => {
                    const style = getComputedStyle(document.getElementById('nav-links'));
                    return { display: style.display, gap: style.gap };
                });
                if (menu.display !== 'flex' || menu.gap === '0px' || menu.gap === 'normal') problems.push(width + ' menú ' + JSON.stringify(menu));
                await page.locator('#nav-toggle').click();
            }
        }
        await page.setViewportSize({ width: 740, height: 360 });
        await page.evaluate(() => navigate('home'));
        const hero = await page.evaluate(() => {
            const nav = document.getElementById('navbar').getBoundingClientRect();
            const card = document.querySelector('.hero-card').getBoundingClientRect();
            return card.top >= nav.bottom - 1;
        });
        if (!hero) problems.push('hero bajo el navbar en 740x360');
        if (problems.length) throw new Error(problems.slice(0, 8).join('\n'));
        pass('22 320', 'sin desborde');
        pass('23 375', 'sin desborde');
        pass('24 768', 'sin desborde');
        pass('25 1280', 'sin desborde');
        await context.close();
    });

    await scenario('26 visibilitychange', 'el refresco no borra la lista ni salta el scroll', async () => {
        const context = await browser.newContext({ viewport: { width: 375, height: 640 } });
        const page = await context.newPage();
        await ready(page);
        await page.evaluate(() => navigate('rooms'));
        await page.waitForFunction(() => [...document.querySelectorAll('#rooms-container img')].every(img => img.complete));
        await page.evaluate(() => window.scrollTo(0, 450));
        await page.waitForTimeout(100);
        const before = await page.evaluate(() => ({ y: window.scrollY, text: document.getElementById('rooms-container').textContent }));
        await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
        await page.waitForTimeout(400);
        const after = await page.evaluate(() => ({ y: window.scrollY, text: document.getElementById('rooms-container').textContent }));
        if (!after.text.includes('De Luxe Room') || after.text.trim() === 'Cargando…') throw new Error(after.text.slice(0, 80));
        if (Math.abs(after.y - before.y) > 40) throw new Error('scroll ' + before.y + ' → ' + after.y);
        await context.close();
    });

    await scenario('27 CDN caído', 'una sola vista visible sin Tailwind', async () => {
        const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.route('**/*', route => {
            if (route.request().url().includes('cdn.tailwindcss.com')) return route.abort();
            return route.continue();
        });
        await page.goto(base + '/', { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => typeof window.navigate === 'function');
        await page.waitForFunction(() => document.getElementById('view-home') && !document.getElementById('view-home').hidden);
        const visible = await page.evaluate(() => [...document.querySelectorAll('main > section')].filter(section => !section.hidden).map(section => section.id));
        if (visible.length !== 1) throw new Error(visible.join(','));
        const modal = await page.evaluate(() => document.getElementById('cancel-modal').hidden);
        if (!modal) throw new Error('modal visible');
        await page.evaluate(() => navigate('rooms'));
        await page.waitForFunction(() => !document.getElementById('view-rooms').hidden && document.getElementById('view-home').hidden);
        const box = await overflow(page);
        if (box.scroll > 1) throw new Error(JSON.stringify(box));
        if (errors.length) throw new Error(errors.join(' | '));
        await context.close();
    });

    await scenario('28 XSS', 'ids y nombres maliciosos no se ejecutan', async () => {
        const context = await browser.newContext();
        const page = await context.newPage();
        await ready(page);
        await page.evaluate(() => navigate('rooms'));
        await page.waitForFunction(() => !document.getElementById('view-rooms').hidden);
        const attacked = await page.evaluate(() => {
            window.__xss = 0;
            const room = {
                id: '1);window.__xss=1;//',
                name: '<img src=x onerror="window.__xss=2">',
                pax: '<script>window.__xss=3</script>',
                priceNum: 100,
                img: 'img/room-deluxe.jpg" onerror="window.__xss=9',
                qty: 1
            };
            const reservation = {
                id: "x');window.__xss=4;//",
                roomName: '<svg onload="window.__xss=5">',
                checkin: '2026-10-01',
                checkout: '2026-10-03',
                price: 100,
                nights: 2,
                total: 200
            };
            document.getElementById('rooms-container').innerHTML = Overlook.components.roomCard(room);
            document.getElementById('reservations-list').innerHTML = Overlook.components.reservationCard(reservation);
            const html = document.getElementById('rooms-container').innerHTML + document.getElementById('reservations-list').innerHTML;
            const img = document.querySelector('#rooms-container img');
            return {
                xss: window.__xss,
                onclick: html.includes('onclick'),
                rawTag: html.includes('<script') || html.includes('<svg') || html.includes('<img src=x'),
                onerror: img && img.hasAttribute('onerror'),
                imgs: document.querySelectorAll('#rooms-container img').length
            };
        });
        if (attacked.xss || attacked.onclick || attacked.rawTag || attacked.onerror || attacked.imgs !== 1) throw new Error(JSON.stringify(attacked));
        await page.evaluate(() => {
            document.getElementById('view-rooms').hidden = true;
            document.getElementById('view-rooms').classList.add('hidden');
            const section = document.getElementById('view-reservations');
            section.hidden = false;
            section.classList.remove('hidden');
        });
        await page.locator('#reservations-list [data-action="open-cancel"]').click();
        await page.keyboard.press('Escape');
        await page.evaluate(() => {
            document.getElementById('view-reservations').hidden = true;
            document.getElementById('view-reservations').classList.add('hidden');
            const section = document.getElementById('view-rooms');
            section.hidden = false;
            section.classList.remove('hidden');
        });
        await page.locator('#rooms-container [data-action="book"]').click();
        await page.waitForTimeout(300);
        const after = await page.evaluate(() => window.__xss);
        if (after) throw new Error('xss ' + after);
        await context.close();
    });

    await scenario('B-01 API', 'reservar por el backend local HTTP', async () => {
        const context = await browser.newContext();
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForFunction(() => typeof Overlook !== 'undefined' && Overlook.services && Overlook.services.booking);
        const report = await page.evaluate(async () => {
            const dates = Overlook.dates;
            let booked = false;
            let error = '';
            try {
                await Overlook.services.booking.book({
                    roomId: 1,
                    userEmail: 'lan@overlook.test',
                    checkin: dates.toISO(dates.addDays(dates.today(), 2)),
                    checkout: dates.toISO(dates.addDays(dates.today(), 4))
                });
                booked = true;
            } catch (failure) { error = failure.message; }
            return { booked, error, rooms: (await Overlook.services.booking.listRooms()).length };
        });
        if (!report.booked || report.rooms !== 3) throw new Error(JSON.stringify(report));
        if (errors.length) throw new Error(errors.join(' | '));
        await context.close();
    });

    await scenario('B-01 file', 'file:// informa que necesita el backend HTTP', async () => {
        const context = await browser.newContext();
        const page = await context.newPage();
        await page.goto(pathToFileURL(path.join(__dirname, '..', 'index.html')).href, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForFunction(() => typeof window.refreshOverlook === 'function', null, { timeout: 10000 });
        await page.waitForFunction(() => document.getElementById('flash-alert').textContent.includes('backend local'));
        await context.close();
    });

    await scenario('A11y', 'labels, diálogo, aria-current y nombres de redes', async () => {
        const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page = await context.newPage();
        await ready(page);
        await page.evaluate(() => navigate('login'));
        const loginA11y = await page.evaluate(() => {
            const input = document.getElementById('login-email');
            const label = document.querySelector('label[for="login-email"]');
            const social = [...document.querySelectorAll('.social-btn')].map(button => button.getAttribute('aria-label'));
            return { linked: label && label.control === input, placeholder: input.placeholder, social, demo: document.body.innerText.includes('Demo') };
        });
        if (!loginA11y.linked || loginA11y.placeholder !== 'tu@correo.com' || loginA11y.social.length !== 3 || loginA11y.social.some(name => !name || !/demo/i.test(name))) throw new Error(JSON.stringify(loginA11y));
        await page.evaluate(() => navigate('about'));
        const current = await page.evaluate(() => document.querySelector('[data-nav="about"]').getAttribute('aria-current'));
        if (current !== 'page') throw new Error(current);
        await context.close();
    });

    if (consoleAll.length) {
        fail('consola', 'errores de consola en la reserva', consoleAll.join(' | '));
    } else pass('consola', 'sin pageerror en la reserva normal');

    await browser.close();
    browser = null;
    await fixture.close();
    fixture = null;
    const failed = results.filter(item => !item.ok);
    console.log('\n--- RESUMEN QA ---');
    for (const item of results) console.log((item.ok ? 'PASS' : 'FAIL') + '\t' + item.id + '\t' + item.name + (item.ok ? '' : '\t' + item.error));
    if (failed.length) process.exitCode = 1;
})().catch(async error => {
    console.error(error);
    if (browser) await browser.close().catch(() => {});
    if (fixture) await fixture.close().catch(() => {});
    process.exitCode = 1;
});
