function socialButton(provider, label, icon) {
    return `
        <button type="button" class="social-btn" data-action="login-social" data-provider="${provider}" aria-label="Continuar con ${label} (demo)">
            ${icon}
            <span>${label}</span>
            <span class="demo-tag">Demo</span>
        </button>`;
}

const googleIcon = '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="20" height="20"><path fill="#7A4638" d="M12 11v2.8h4.4c-.2 1.2-1.4 3.5-4.4 3.5A5.1 5.1 0 1 1 12 6.9c1.5 0 2.5.6 3.1 1.2l2.1-2.1C15.9 4.7 14.2 4 12 4a8 8 0 1 0 0 16c4.6 0 7.6-3.2 7.6-7.7 0-.5 0-.9-.1-1.3H12z"/></svg>';
const appleIcon = '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="20" height="20"><path fill="#1D1D1B" d="M16.4 12.7c0-2.2 1.8-3.2 1.9-3.3-1-1.5-2.6-1.7-3.2-1.7-1.3-.1-2.6.8-3.3.8s-1.7-.8-2.9-.8c-1.5 0-2.9.9-3.6 2.2-1.6 2.7-.4 6.7 1.1 8.9.7 1.1 1.6 2.3 2.8 2.2 1.1 0 1.5-.7 2.9-.7s1.7.7 2.9.7 1.9-1.1 2.6-2.2c.8-1.2 1.2-2.3 1.2-2.4-.1 0-2.4-.9-2.4-3.7zM14.7 6.8c.6-.7 1-1.7.9-2.8-1 .1-2.1.6-2.8 1.4-.6.7-1.1 1.7-.9 2.7 1 .1 2.1-.5 2.8-1.3z"/></svg>';
const facebookIcon = '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="20" height="20"><path fill="#7A4638" d="M14.5 8.5V6.8c0-.7.5-1 1.2-1H17V3h-2.1C12.4 3 11 4.5 11 6.6v1.9H9v2.8h2V21h3.5v-9.7h2.3l.4-2.8h-2.7z"/></svg>';

Overlook.views.login = `
<section id="view-login" class="view view-pad" hidden>
    <div class="form-card login-card">
        <h1>Inicia sesión</h1>
        <p class="lede">Entra para ver tus reservas o continuar la habitación que elegiste. El acceso es una demostración.</p>
        <form id="login-form" novalidate>
            <div class="field">
                <label for="login-email">Correo electrónico</label>
                <input id="login-email" name="email" type="email" inputmode="email" autocomplete="email" placeholder="tu@correo.com" required>
            </div>
            <p id="login-error" class="form-error" role="alert"></p>
            <button type="submit" class="luxury-button btn-block">Continuar</button>
        </form>
        <p class="or-line" aria-hidden="true"><span>o</span></p>
        <div class="social-row">
            ${socialButton('Google', 'Google', googleIcon)}
            ${socialButton('Apple', 'Apple', appleIcon)}
            ${socialButton('Facebook', 'Facebook', facebookIcon)}
        </div>
    </div>
</section>`;
