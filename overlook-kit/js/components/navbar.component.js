Overlook.components.navbar = `
<header class="site-header" id="navbar">
    <a class="skip-link" href="#app-content">Saltar al contenido</a>
    <div class="nav-bar">
        <a class="logo" href="#/home" data-nav="home">Overlook</a>
        <button id="nav-toggle" type="button" aria-controls="nav-links" aria-expanded="false" aria-label="Abrir menú" data-action="toggle-nav">
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
                <path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
            </svg>
        </button>
        <nav id="nav-links" aria-label="Principal">
            <a class="nav-pill" href="#/rooms" data-nav="rooms">Habitaciones</a>
            <a class="nav-pill" href="#/about" data-nav="about">Nosotros</a>
            <a class="nav-pill" href="#/reservations" data-nav="reservations" id="nav-reservations" hidden>Mis reservas</a>
            <a class="nav-pill nav-cta" href="#/rooms">Reservar</a>
            <span class="nav-user" id="nav-user" hidden></span>
            <button type="button" class="nav-pill" id="nav-logout" data-action="logout" hidden>Cerrar sesión</button>
            <a class="nav-pill" href="#/login" data-nav="login" id="nav-login">Iniciar sesión</a>
        </nav>
    </div>
</header>`;
