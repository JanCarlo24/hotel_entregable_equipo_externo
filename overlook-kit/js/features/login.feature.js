async function finishLogin(email, nombre) {
    const pendingId = Overlook.state.roomToBook ? Overlook.state.roomToBook.id : null;
    const previous = Overlook.services.auth.getStoredUser();
    const user = Overlook.services.auth.login({ email, nombre });
    const error = document.getElementById('login-error');
    if (!user) {
        if (error) error.textContent = 'Escribe un correo válido, por ejemplo tu@correo.com.';
        return;
    }
    if (error) error.textContent = '';
    const changed = Boolean(previous && previous.email !== user.email);
    if (pendingId != null && !changed) {
        await startCheckout(pendingId);
        return;
    }
    await navigate('rooms');
}

window.finishLogin = finishLogin;

window.initLoginForm = function initLoginForm() {
    const form = document.getElementById('login-form');
    form.addEventListener('submit', async event => {
        event.preventDefault();
        const input = document.getElementById('login-email');
        if (!form.reportValidity()) {
            const error = document.getElementById('login-error');
            if (error) error.textContent = 'Escribe un correo válido, por ejemplo tu@correo.com.';
            return;
        }
        const local = input.value.trim().toLowerCase().split('@')[0] || 'Huésped';
        const nombre = local.charAt(0).toUpperCase() + local.slice(1);
        await finishLogin(input.value, nombre);
    });
};
