function updateAuthUI() {
    const user = Overlook.services.auth.getStoredUser();
    const reservations = document.getElementById('nav-reservations');
    const name = document.getElementById('nav-user');
    const logout = document.getElementById('nav-logout');
    const login = document.getElementById('nav-login');
    if (!reservations || !name || !logout || !login) return;
    const signedIn = Boolean(user);
    reservations.hidden = !signedIn;
    name.hidden = !signedIn;
    logout.hidden = !signedIn;
    login.hidden = signedIn;
    name.textContent = signedIn ? user.nombre : '';
}

window.updateAuthUI = updateAuthUI;
