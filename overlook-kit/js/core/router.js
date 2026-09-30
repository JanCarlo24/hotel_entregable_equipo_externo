/* Navegación por hash. Las vistas registran onEnter; el router no conoce el DOM de cada feature. */
Overlook.router = {
    generation: 0,
    active: null,
    hooks: {},
    onEnter(id, fn) { this.hooks[id] = fn; }
};

function canonicalView(viewId) {
    if (!Overlook.views[viewId]) return 'home';
    if (viewId === 'reservations' && !Overlook.services.auth.getStoredUser()) return 'login';
    if (viewId === 'checkout' && !Overlook.state.roomToBook) return 'rooms';
    return viewId;
}

function closeNavMenu() {
    const navLinks = document.getElementById('nav-links');
    const navToggle = document.getElementById('nav-toggle');
    if (navLinks) navLinks.classList.remove('is-open');
    if (navToggle) {
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.setAttribute('aria-label', 'Abrir menú');
    }
}

function updateNavState(viewId) {
    document.querySelectorAll('[data-nav]').forEach(link => {
        if (link.getAttribute('data-nav') === viewId) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
    });
}

const VIEW_TITLES = {
    home: 'Inicio',
    about: 'Nosotros',
    rooms: 'Habitaciones',
    checkout: 'Reservar',
    login: 'Iniciar sesión',
    reservations: 'Mis reservas'
};

async function show(viewId) {
    const resolved = canonicalView(viewId);
    const hash = '#/' + resolved;
    if (location.hash !== hash) history.replaceState(null, '', hash);
    updateNavState(resolved);
    closeNavMenu();
    if (Overlook.router.active === resolved) return;
    Overlook.router.generation += 1;
    Overlook.router.active = resolved;
    document.querySelectorAll('main > section').forEach(section => {
        section.classList.add('hidden');
        section.hidden = true;
    });
    const section = document.getElementById('view-' + resolved);
    if (!section) return;
    section.classList.remove('hidden');
    section.hidden = false;
    document.title = 'Overlook Resort & Spa — ' + (VIEW_TITLES[resolved] || 'Inicio');
    window.scrollTo(0, 0);
    const heading = section.querySelector('h1');
    if (heading) {
        heading.setAttribute('tabindex', '-1');
        heading.focus({ preventScroll: true });
    }
    const hook = Overlook.router.hooks[resolved];
    if (typeof hook === 'function') await hook();
}

window.toggleNavMenu = function toggleNavMenu() {
    const navLinks = document.getElementById('nav-links');
    const navToggle = document.getElementById('nav-toggle');
    if (!navLinks || !navToggle) return;
    const willOpen = navToggle.getAttribute('aria-expanded') !== 'true';
    navToggle.setAttribute('aria-expanded', String(willOpen));
    navToggle.setAttribute('aria-label', willOpen ? 'Cerrar menú' : 'Abrir menú');
    navLinks.classList.toggle('is-open', willOpen);
};

window.navigate = async function navigate(viewId) {
    const requested = String(viewId || 'home');
    const resolved = canonicalView(requested);
    const hash = '#/' + resolved;
    if (location.hash !== hash) {
        if (resolved !== requested) history.replaceState(null, '', hash);
        else location.hash = hash;
    }
    await show(resolved);
};

window.addEventListener('hashchange', () => {
    const requested = (location.hash || '').replace(/^#\/?/, '').split('?')[0] || 'home';
    show(requested);
});
