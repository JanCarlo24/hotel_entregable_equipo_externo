/* Sesión de demostración. No toca el DOM: la interfaz escucha overlook:auth-changed. */
Overlook.services.auth = (() => {
    const KEY = 'overlook_user';
    const DEMO = {
        Google: { email: 'invitado@gmail.com', nombre: 'Usuario Google' },
        Apple: { email: 'invitado@icloud.com', nombre: 'Usuario Apple' },
        Facebook: { email: 'invitado@facebook.com', nombre: 'Usuario Facebook' }
    };

    function read() {
        try {
            const raw = localStorage.getItem(KEY);
            if (!raw) return null;
            const user = JSON.parse(raw);
            if (!user || typeof user !== 'object' || typeof user.email !== 'string') return null;
            const email = user.email.trim().toLowerCase();
            if (!email.includes('@') || !email.includes('.')) return null;
            const nombre = typeof user.nombre === 'string' && user.nombre.trim() ? user.nombre.trim() : 'Huésped';
            return { email, nombre };
        } catch (error) {
            return null;
        }
    }

    function getStoredUser() {
        const user = read();
        if (user) return user;
        try {
            if (localStorage.getItem(KEY)) localStorage.removeItem(KEY);
        } catch (error) { /* localStorage no disponible. */ }
        return null;
    }

    function login({ email, nombre }) {
        const previous = getStoredUser();
        const nextEmail = String(email || '').trim().toLowerCase();
        if (!nextEmail.includes('@') || !nextEmail.includes('.')) return null;
        const next = { email: nextEmail, nombre: nombre && String(nombre).trim() ? String(nombre).trim() : 'Huésped' };
        if (previous && previous.email !== next.email) Overlook.state.reset();
        localStorage.setItem(KEY, JSON.stringify(next));
        window.dispatchEvent(new CustomEvent('overlook:auth-changed', { detail: next }));
        return next;
    }

    function logout() {
        localStorage.removeItem(KEY);
        Overlook.state.reset();
        window.dispatchEvent(new CustomEvent('overlook:auth-changed', { detail: null }));
    }

    return { getStoredUser, login, logout, DEMO };
})();

function getStoredUser() {
    return Overlook.services.auth.getStoredUser();
}
