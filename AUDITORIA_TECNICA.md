# Overlook Resort & Spa — AUDITORÍA TÉCNICA

> **Repositorio:** https://github.com/JanCarlo24/hotel_entregable_equipo_externo
> **Commit auditado:** `75a23566acb365cc01a291bd4392b92f522ae567` ("Primera versión", Jan Carlo, 30-sep-2026 11:34 CST)
> **Fecha de auditoría:** 30-sep-2026 (hora de CDMX)
> **Tipo de auditoría:** solo lectura. No se modificó ningún archivo del repo (`git status` limpio al terminar). Los scripts de QA propios viven fuera del repo, en `/workspace/hotel-audit/tools/`.
> **Capturas:** `/workspace/hotel-audit/screenshots/` (se citan como `screenshots/<archivo>.png`).

> **Nota de vigencia (02-oct-2026):** las secciones 1–10 y los anexos documentan la auditoría del commit indicado, no el estado actual del código. Después se añadió un backend local y se conectó la interfaz a su API; la arquitectura y las verificaciones de esa actualización están documentadas al final, en «Actualización: backend local». Las afirmaciones originales de «sin backend» y «persistencia IndexedDB» son históricas.

### ¿Por qué el nombre "Overlook Resort & Spa"?
No se asumió: se verificó en el código. El nombre aparece de forma consistente en:
- `overlook-kit/index.html` L7 y `index.base.html` L7: `<title>Overlook Resort & Spa</title>`.
- `LEEME-original.md` L1: "🧱 Overlook Resort & Spa — Kit de armado"; `LEEME.md` L1: "Overlook — kit de componentes asíncronos".
- Marca visible: `navbar.component.js` L12 (`OVERLOOK`) y `home.view.js` L12 (`<h1>OVERLOOK</h1>`).
- Namespace y almacenamiento: `window.Overlook` (`core/registry.js` L9), IndexedDB `overlook-async-v1` (`booking.service.js` L6), `localStorage.overlook_user`, correo `invitado@overlook.com` (`auth.service.js` L48), carpeta `overlook-kit/`.

El nombre del repo (`hotel_entregable_equipo_externo`) solo describe el propósito de la entrega: un **kit front-end de un sitio de reservas de hotel entregado a otro equipo** para que lo integre o lo conecte a su API.

---

## 1. Executive Summary

**Qué es:** una SPA (aplicación de una sola página) estática, sin backend y sin paso de compilación, de un hotel ficticio ("Overlook Resort & Spa"). Tiene 6 vistas: Inicio, Sobre nosotros, Habitaciones, Checkout/Pago, Login y Mis reservaciones, más un modal de cancelación. Usa HTML + Tailwind por CDN + JS "vanilla" en 25 scripts clásicos cargados en orden. El login y el pago son simulados. La persistencia usa **IndexedDB** con una sola transacción `readwrite` para reservar o cancelar, lo que evita la sobreventa entre pestañas.

**Veredicto general:** la base técnica del "núcleo de datos" es **buena para un proyecto académico**: transacción atómica, control de respuestas obsoletas, protección contra doble envío y pruebas que **sí pasan**. Se ejecutaron `tests/service.cjs` y `tests/concurrency.cjs` en esta auditoría y ambas dieron OK. La **capa de UI/UX, responsive y accesibilidad es la parte débil**:
- hay tres lenguajes visuales distintos;
- el checkout no muestra el total antes de "pagar";
- el botón "atrás" saca al usuario de la app;
- los formularios no tienen labels asociados;
- el modal no es accesible;
- en móvil la página salta al inicio cada vez que la pestaña recupera el foco.

**Bugs verificados (24):** 🔴 1 CRITICAL · 🟠 4 HIGH · 🟡 8 MEDIUM · 🟢 11 LOW. Además hay 6 riesgos potenciales de seguridad (sección 9).

**Top 5 hallazgos:**
1. 🔴 **Reservar falla por completo fuera de un "contexto seguro"** (por ejemplo, al abrir la app desde un celular con `http://192.168.x.x:8000`). `crypto.randomUUID` no existe ahí y el usuario ve el alert *"crypto.randomUUID is not a function"* (`booking.service.js` L48). Verificado en navegador.
2. 🟠 **El checkout nunca muestra noches ni total.** Dice "Total a pagar: $1890 MXN / Noche" (`checkout.feature.js` L27), así que el usuario confirma el "pago" sin saber cuánto paga. Se probó una estancia de 25 566 noches por **$53 432 940 MXN** y se aceptó sin advertencia.
3. 🟠 **Sin Internet (o si falla el CDN de Tailwind) la app se rompe entera:** todas las vistas y el modal se ven a la vez, porque la clase `hidden` depende de Tailwind (captura `screenshots/1280-sin-internet-cdn.png`). Es un riesgo alto el día de la demo.
4. 🟠 **Refresco al recuperar foco** (`main.js` L29 + `async-list.component.js` L10). Borra las listas con "Cargando…" y hace saltar el scroll: medido de 939 px a 0 px.
5. 🟠 **Navegación sin historial.** El botón atrás del navegador sale del sitio y recargar siempre regresa a Inicio (`router.js` L20-38).

**Lo que está bien hecho:** la organización de carpetas por responsabilidad, la atomicidad en IndexedDB, el contador de versión en `asyncList`, el escape HTML con `safeRecord`, el bloqueo de doble envío, la validación de fechas en el servicio, el fallback de imagen, el `aria-expanded` del menú, que no haya IDs duplicados ni overflow horizontal de 320 a 1280 px (medido), y un LEEME honesto sobre sus limitaciones.

---

## 2. Project Understanding

### 2.1 Estructura de carpetas (32 archivos versionados, ~1 300 líneas)
```
overlook-kit/
├── index.html            (62)  página armada: 1 CDN Tailwind + Google Fonts + 25 <script> en orden
├── index.base.html       (20)  "placa base" vacía para el tutorial (sin uso en runtime)
├── LEEME.md              (173) guía actual (IndexedDB, concurrencia, integración)
├── LEEME-original.md     (174) guía anterior (localStorage) – DESACTUALIZADA
├── .gitignore
├── css/styles.css        (86)  variables CSS + ~10 clases propias
├── js/
│   ├── config/tailwind.config.js   paleta/fuentes/sombras de Tailwind (CDN)
│   ├── core/registry.js            window.Overlook = {components, views}
│   ├── core/state.js               let currentRoomToBook, reservationToCancel (globales)
│   ├── core/storage-init.js        1 línea de comentario (código muerto)
│   ├── core/router.js              navigate(), toggleNavMenu()
│   ├── data/rooms.data.js          const defaultRooms (3 habitaciones)
│   ├── services/booking.service.js IndexedDB: listRooms, listReservations, book, cancel
│   ├── services/auth.service.js    sesión simulada + manipulación del navbar
│   ├── components/  navbar, cancel-modal (strings HTML), roomCard, reservationCard (funciones→HTML), async-list (+ escape/safeRecord)
│   ├── views/       home, about, rooms, checkout, login, reservations (strings HTML)
│   ├── features/    rooms-list, reservations-list, checkout, cancel-flow (lógica)
│   └── main.js                     arranque: monta HTML, enlaza eventos, carga listas
└── tests/  service.cjs (Node + fake-indexeddb), concurrency.cjs (Playwright)
```

### 2.2 Tecnologías y dependencias externas
| Recurso | Cómo se carga | Observación |
|---|---|---|
| Tailwind CSS v3 (runtime JIT) | `<script src="https://cdn.tailwindcss.com">` en `<head>` (index.html L9) | Sin versión fija: hace un 302 a `/3.4.17`, ~398 KB. Muestra en consola el aviso "should not be used in production". |
| Google Fonts (Montserrat 300/400/600, Playfair 400/600/400i) | `<link>` (L11) | Sin `preconnect`. El peso 700 no se carga aunque se usa `font-bold`. |
| Imágenes Unsplash (3) | URL absoluta en `rooms.data.js` | Tamaño 1170×780, se muestran a 355×208 px. |
| IndexedDB, `crypto.randomUUID` | API del navegador | `randomUUID` exige un contexto seguro (HTTPS o localhost). |
| Playwright / fake-indexeddb | Solo para pruebas (`npm install --no-save`) | No hay `package.json`. |

No hay backend, ni API, ni variables de entorno, ni secretos.

### 2.3 Cómo se comunican las piezas
1. `index.html` carga 25 scripts **clásicos** (no módulos) en un orden estricto. Todo se comparte por el ámbito global: `window.Overlook.*`, funciones `window.navigate/startCheckout/...` y `let`/`const` de nivel superior (`currentRoomToBook`, `defaultRooms`, `cancelBusy`, `checkoutRequest`, `roomsListComponent`…).
2. Las **vistas y los componentes** son *template strings* registrados en `Overlook.views` y `Overlook.components`.
3. `main.js` inyecta todo el HTML con `innerHTML` (L13-15), llama a `initCheckoutForm()` e `initCancelFlow()`, luego a `updateAuthUI()` y `navigate('home')`, y lanza en paralelo `renderRooms()` y `renderReservations()` con `Promise.allSettled` (L25-26).
4. Los templates usan **`onclick="..."` inline** (16 ocurrencias). Por eso las funciones deben ser globales.
5. Flujo de datos: `features/*` → `Overlook.services.booking` (promesas sobre IndexedDB) → evento `overlook:data-changed` (solo en la misma pestaña) → `refreshOverlook()`. Otras pestañas se actualizan con `window.focus`.
6. La sesión vive en `localStorage.overlook_user` (`{email, nombre}`).

### 2.4 Pantallas y funcionalidades
| Vista | Implementado | Incompleto / simulado |
|---|---|---|
| Inicio (`home.view.js`) | Hero de texto con 2 CTA | Sin imagen, footer, contacto ni ubicación |
| Sobre nosotros | 3 tarjetas de texto | Copy genérico, sin imágenes |
| Habitaciones | Lista asíncrona, disponibilidad, estado "Agotada" | Inventario global (no por fechas), documentado |
| Checkout | Fechas con `min`, validación en servicio, doble envío bloqueado | Tarjeta solo visual; **sin resumen de total** |
| Login | Email manual validado con `checkValidity`, 3 "sociales" | Sociales = cuentas compartidas falsas; Enter no envía |
| Mis reservaciones | Lista, cancelación con modal, total guardado | Sin feedback de éxito ni orden |

### 2.5 Cómo ejecutarlo (verificado)
```bash
cd overlook-kit && python3 -m http.server 8765      # http://localhost:8765
# pruebas (dependencias fuera del repo):
NODE_PATH=<dir>/node_modules node tests/service.cjs            # OK
CHROMIUM_PATH=/usr/bin/google-chrome node tests/concurrency.cjs # OK
```
También funciona con `file://` en Chrome (verificado; `isSecureContext` es `true`). **No funciona bien** servido por IP de red local sobre HTTP (ver B-01).

### 2.6 Código muerto / archivos sin uso
- `js/core/storage-init.js`: 1 línea de comentario, pero se sigue cargando (index.html L26), lo que cuesta una petición extra.
- `css/styles.css` `.soft-shell` (L70-74): no se usa en ningún template.
- Variables CSS sin uso: `--overlook-panel, forest, sage, sand, rose, cream, moss, taupe` (L3-13). 8 de 12.
- Colores Tailwind sin uso: `dark, forest, sage, sand, terracotta, rose, cream, ink, moss, taupe` (`tailwind.config.js` L13-24). Solo se usan `overlook-bg` y `overlook-pink`.
- Neutralizadores sobrantes: `.luxury-button:hover { transform:none }` (L55-58) y varios `box-shadow:none`.
- `index.base.html` y `LEEME-original.md` son material del tutorial previo. El segundo **contradice** el estado actual: habla de localStorage, "doble clic", `#FF99D6` y `Object.keys(Overlook.components)` = 2.
- El comentario `<!-- PASO 3 -->` de index.html ya no refleja la realidad: `booking.service.js` está insertado sin paso.

---

## 3. Architecture Review

### 3.1 Lo bueno
- **Separación por carpetas con intención clara**: `views` (HTML), `components` (HTML reutilizable), `services` (datos), `features` (orquestación), `core` (infraestructura). Es fácil encontrar las cosas.
- **El servicio de reservas está bien encapsulado** detrás de promesas (`booking.service.js` L35-61). Se puede cambiar por una API con el mismo contrato, como indica LEEME.md L121-131.
- `asyncList.mount()` devuelve `{refresh, destroy}` con estado propio por instancia. Es un buen patrón.

### 3.2 Problemas
| # | Archivo | Qué hace hoy | Problema | Cómo lo dividiría |
|---|---|---|---|---|
| A1 | `core/router.js` | (a) muestra/oculta secciones, (b) regla de autorización (`reservations` → `login`, L22, leyendo `localStorage` crudo), (c) cierra el menú móvil (L26-32), (d) conoce y llama a `renderRooms`/`renderReservations` (L34-36), (e) scroll, (f) `toggleNavMenu` (L9-18) | El router depende de las features y del navbar: alto acoplamiento y baja cohesión. Agregar una vista obliga a tocar el router. | `router.js`: solo `navigate(id)` + un registro de hooks `onEnter` por vista y `hashchange`. `navbar.feature.js`: `toggleNavMenu/closeNavMenu`. Cada feature registra su hook (`rooms` → `renderRooms`). La guarda de auth usa `getStoredUser()`. |
| A2 | `services/auth.service.js` | (a) lee y escribe la sesión, (b) **crea botones del navbar con clases Tailwind duplicadas** (L35-40), (c) **lee el input del DOM** de la vista login (L56), (d) decide la redirección posterior al login y continúa el checkout (L72-79) | Un "servicio" que manipula el DOM y conoce el flujo de checkout. No se puede reutilizar ni probar sin DOM. | `auth.service.js`: `getUser()`, `login(email,nombre)`, `logout()`, y emite `overlook:auth-changed`. `navbar.component.js` se re-renderiza a partir del usuario. `login.feature.js`: lee el formulario y decide la redirección. |
| A3 | `features/checkout.feature.js` | (a) consulta la habitación, (b) muta el estado global, (c) redirige a login, (d) formatea fechas (3 copias, L35/L42/L50), (e) configura restricciones de fecha, (f) maneja el submit y la navegación | Función de 50 líneas con 6 responsabilidades y formateo duplicado (también en `booking.service.js` L41). | `core/dates.js` (`toLocalISODate`, `addDays`, `nightsBetween`), `checkout.feature.js` con `prepareCheckout(room)`, `updateSummary()` y `submitCheckout()`. |
| A4 | Estado global | `currentRoomToBook`/`reservationToCancel` (`state.js` L8-9) + `cancelBusy`, `checkoutRequest`, `roomsListComponent`, `reservationsListComponent` en cada feature | Estado mutable compartido por ámbito léxico global entre 4 archivos. El orden de carga es parte del contrato. Hay fugas de estado entre sesiones (B-07). | `Overlook.state = { roomToBook: null, reservationToCancel: null }` con `reset()` llamado en `logout()`. No hace falta un store ni un framework. |
| A5 | Lectura de sesión | 3 formas: `getStoredUser()` (auth L8), `localStorage.getItem` crudo (router L22), `JSON.parse(localStorage.getItem(...))` sin try (reservations-list L5) | Comportamientos distintos ante datos corruptos (B-20). | Usar `getStoredUser()` en todas partes. |
| A6 | Orquestación de refrescos | Tres disparadores: `overlook:data-changed` (main L27), `focus` (L29) y `navigate()` (router L34-36), más llamadas explícitas (`cancel-flow` L24, `checkout` L79 vía navigate) | Renders duplicados (medido: 2 cargas de la lista de reservas por cada reserva), parpadeo y salto de scroll (B-04). | Un solo punto: `data-changed` → refresh. `navigate` solo refresca si hay datos obsoletos. `focus` solo si es otra pestaña (o usar `BroadcastChannel`). |
| A7 | `components/async-list.component.js` | Componente de lista **+ utilidades de escape** (`Overlook.escape`, `safeRecord`, L26-27) | Baja cohesión: las utilidades de seguridad dependen de cargar un componente. | `core/html.js` con `escape` y `safeRecord`. |
| A8 | Templates con `onclick` inline | 16 handlers inline (`navigate(...)`, `startCheckout(${room.id})`, `openCancelModal('${res.id}')`) | Obligan a tener globales, impiden una CSP estricta y abren XSS en contexto de atributo (R-1). | `data-action="book" data-room-id="…"` + **un** listener delegado por contenedor. |
| A9 | Dos fuentes de verdad de diseño | `styles.css :root` y `tailwind.config.js` definen **los mismos nombres con valores distintos** (ver 5.2) | La paleta real es impredecible. | Una sola fuente: `tailwind.config.js`. `styles.css` solo para lo que Tailwind no cubre. |

**Veredicto de arquitectura: ACEPTABLE PERO MEJORABLE.** La estructura de carpetas y el servicio de datos son sólidos y adecuados al alcance. Los problemas vienen de responsabilidades cruzadas (router ↔ features, servicio ↔ DOM), del estado global implícito y de los handlers inline. Nada de esto requiere cambiar de stack: se resuelve moviendo funciones de archivo y con delegación de eventos.

---

## 4. HTML Review

| # | Hallazgo | Ubicación | Tipo | Detalle / cambio |
|---|---|---|---|---|
| H1 | **Labels no asociados** (6 de 6) | `checkout.view.js` L17, L21, L27, L32, L36; `login.view.js` L16 | Bug a11y | Medido: `label.control === null` en los 6. Los lectores de pantalla anuncian "editar texto" sin nombre y hacer clic en el label no enfoca. **Cambio:** `id` único + `for`. |
| H2 | Inputs sin `id`/`name`/`autocomplete`/`inputmode` | checkout L28, L33, L37; login L17 | Bug a11y/UX | Tarjeta: `inputmode="numeric" autocomplete="cc-number"` (o `off` si se quiere evitar que se guarde), `cc-exp`, `cc-csc`. Email: `autocomplete="email"`. |
| H3 | **Login no es un `<form>`** | `login.view.js` L15-21 | Bug | Enter en el email no hace nada (verificado, B-08). Envolver en `<form>` con `submit` y `type="submit"`. |
| H4 | Navegación con `<button>` en vez de `<a href="#/rooms">` | `navbar.component.js` L20-22, home L15-16 | Code smell / SEO | Sin URLs: no se puede abrir en otra pestaña, compartir, usar el historial ni indexar. |
| H5 | **Logo = `<div onclick>`** | `navbar.component.js` L11 | Bug a11y | `tabIndex -1`, sin rol (medido): no se alcanza con el teclado. Usar `<a href="#/home">`. |
| H6 | Modal sin semántica de diálogo | `cancel-modal.component.js` L9-18 | Bug a11y | Falta `role="dialog" aria-modal="true" aria-labelledby`. Ver B-09. |
| H7 | Jerarquía de encabezados | home L12 (único `h1`); resto de vistas empieza en `h2`; `reservationCard` L8 usa `h4` después de `h2` (salta el `h3`); modal `h3` antes del `h1` en el DOM | Recomendación | Cada vista visible debería tener su `h1` (o `h1` fijo = marca en `header` y `h2` por vista, sin saltos). |
| H8 | Botones sociales sin nombre accesible | `login.view.js` L30-32 | Bug a11y | Se leen como "G", "f" y **vacío** (Apple usa el carácter de uso privado U+F8FF, ver B-11). Agregar `aria-label="Continuar con Google (demo)"`. |
| H9 | Decoración sin `aria-hidden` | `login.view.js` L11 (`✦`) | Menor | `aria-hidden="true"`. |
| H10 | Estados sin `aria-live` | `async-list` L9-18, `alert()` en 4 sitios | Recomendación | "Cargando…", errores y "sin reservas" no se anuncian. Un `role="status"` en el contenedor basta. |
| H11 | Sin `aria-current` en el navbar | navbar L20-22 | Recomendación | No hay indicación (visual ni semántica) de la vista activa. |
| H12 | SEO/meta | index.html L4-15 | Recomendación | Falta `meta description` y favicon (404 en `/favicon.ico`, visto en el log del servidor). Todo el contenido se inyecta por JS en una sola URL. |
| H13 | Comentario antes de `<!DOCTYPE>` | index.html L1, index.base.html L1 | Code smell | Verificado `document.compatMode === "CSS1Compat"` (no hay quirks), pero es una mala práctica. Moverlo después del doctype. |
| H14 | Idioma mezclado | `rooms.data.js` L9-11 ("2 ADULTS \| 1 CHILD BELOW 7"), home L13 (tagline en inglés) con `lang="es"` | UX | Traducir o marcar `lang="en"` en esos fragmentos. |
| H15 | Placeholder sin acento y en mayúsculas | `login.view.js` L17 "INDICA TU DIRECCION DE EMAIL" | Menor | Se trunca en 375 px (captura `375-05-login.png`). Cambiar a "tu@correo.com". |

**Positivo:** `lang="es"`, meta viewport, `<main>` y `<nav>` presentes, **0 IDs duplicados** (medido), `nav-toggle` con `aria-controls/aria-expanded/aria-label` bien actualizados (`router.js` L14-17), `aria-busy` en las listas, el SVG del menú con `aria-hidden` y `alt` en las imágenes de habitación.

---

## 5. CSS Review

### 5.1 Arquitectura
- Hay ~95% de utilidades Tailwind inline en los templates y ~10 clases propias en `styles.css`. Es un enfoque válido para el alcance, **pero** sin disciplina de tokens: hay **40 hex distintos** hardcodeados en *arbitrary values* (`#1d1d1b` aparece 23 veces, más `#18252B`, `#1f3e3d`, `#1e2a2b`, `#261933`, `#5b2a86`, `#d76d84`, `#b2475f`…).
- Las clases propias tienen nombres descriptivos (`luxury-button`, `secondary-button`, `luxury-card`), pero conviven con botones construidos a mano con utilidades que no las usan: navbar, reservas, modal y checkout.

### 5.2 Dos paletas en conflicto (bug de mantenimiento)
| Token | `styles.css :root` | `tailwind.config.js` | ¿Cuál se ve? |
|---|---|---|---|
| bg | `#f5f1ea` (L2) | `#F4EFE8` (L13) | Tailwind: `body.bg-overlook-bg` gana en especificidad a `body{background:var(--overlook-bg)}` (medido: `rgb(244,239,232)`) |
| dark | `#1d1d1b` (L4) | `#18252B` (L14) | Se usan ambos (hardcodeados) |
| terracotta | `#a86f5a` (L8) | `#B65F52` (L18) | El CTA usa el de CSS (medido `rgb(168,111,90)`); el de Tailwind no se usa |
| forest/sage/sand/rose/cream/ink/moss/taupe | valores A | valores B distintos | Casi ninguno se usa |

**Cambio:** dejar la paleta **solo** en `tailwind.config.js`, usar `text-overlook-dark` / `bg-overlook-terracotta` en los templates, y en `styles.css` referenciar los mismos valores o eliminar el bloque `:root` sin uso.

### 5.3 Tres lenguajes visuales
- **Beige/terracota** en Inicio, Sobre nosotros y Habitaciones.
- **Morado nocturno** en Login: `bg-[radial-gradient(circle_at_top,_#4a2b78,_#1f102f_60%)]`, `#5b2a86`, `#e9ddff`, `#a78bfa` (`login.view.js` L9-32).
- **Degradado morado→rosa** en el CTA del checkout (`from-purple-400 to-pink-400`, `checkout.view.js` L40).
- **Rosa** en la tarjeta de reserva (`border-[#d76d84]`, `reservationCard` L5).
- **Rojo Tailwind** en el modal (`bg-red-500 shadow-red-500/30`, `cancel-modal` L15).

El resultado se percibe como piezas de proyectos distintos (comparar `1280-01-home.png`, `1280-05-login.png` y `1280-06-checkout.png`).

### 5.4 Pixel pushing / fondos casi idénticos
Cada sección define su propio beige: `#f5f1ea` (about L9), `#f5efe8` (rooms L9), `#f7f2ed` (reservations L9), `bg-overlook-bg` (checkout L9), degradado `#f7f3ee→#f1e9e0` (`.bg-hero`). Son diferencias imperceptibles que solo añaden ruido. **Cambio:** que las secciones no declaren fondo (lo hereda el `body`), salvo el hero.

### 5.5 Responsive y layout (medido con Chromium en 320, 360, 375, 740×360, 768, 820, 900, 1024 y 1280)
- ✅ No hay overflow horizontal en ninguna vista ni ancho (medido con `scrollWidth` y los rects de todos los nodos).
- ❌ **Navbar en 2 filas entre 768 y ~1023 px** (`navbar.component.js` L10 `flex-wrap` + `md:flex`). La altura pasa de 71 a **115 px**, pero las vistas compensan con `pt-28` fijo (112 px). El título "Nuestras habitaciones" queda 3 px bajo el navbar (`768-04-rooms.png`, `768-nav-2-filas-about.png`), y además se ve desalineado: logo arriba y pills a la izquierda abajo. **Cambio:** pasar el menú de escritorio a `lg:` o reducir `tracking`/padding de las pills, y usar `sticky top-0` en lugar de `fixed` para eliminar los `pt-24/pt-28` mágicos.
- ❌ **Landscape móvil (740×360):** el hero (`home.view.js` L9, `min-h-screen flex items-center` sin `pt`) queda 25 px bajo el navbar (`740x360-home-landscape.png`).
- ❌ **Menú móvil:** `#nav-links` tiene `flex-col gap-2 items-stretch` pero **no tiene `flex` en móvil**, solo `md:flex` (L19). Medido: `display:block`, así que el `gap` no se aplica y las pills quedan pegadas (`320-02-menu-abierto.png`). **Cambio:** alternar `hidden`/`flex` en lugar de `hidden`/`block`.
- ❌ **Fechas recortadas en 320 px:** dos `input[type=date]` con `w-1/2` en una tarjeta `p-8` quedan en 126 px de ancho y muestran "09/30/20" y "10/01/202" (`320-06-checkout.png`). **Cambio:** `grid grid-cols-1 sm:grid-cols-2`, o bajar el padding a `p-5 sm:p-8`.
- ❌ **Modal pegado a los bordes** en ≤384 px: `max-w-sm w-full` sin margen (medido left 0 / right 375, `375-08-modal.png`). **Cambio:** `mx-4` o `p-4` en el overlay.
- ⚠️ Solo se usan los breakpoints `md:` (23) y `sm:` (1). Las rejillas saltan de 1 a 3 columnas en 768 px (`rooms.view.js` L12, `about.view.js` L13), con tarjetas de ~218 px y títulos en 2 líneas. **Cambio:** `sm:grid-cols-2 lg:grid-cols-3`.
- ⚠️ `body { overflow-x:hidden }` (`styles.css` L19) esconde desbordes en lugar de corregirlos. Además rompe `position: sticky` si se adopta. Hoy no hace falta (no hay overflow).

### 5.6 Estados y detalles
- **Focus casi invisible:** `button:focus-visible { outline: 3px solid rgba(168,111,90,.25) }` (L34-37) da un contraste de ~**1.35:1** sobre crema (`1280-focus-visible-debil.png`). En los inputs del checkout se usa `focus:outline-none` + `ring-overlook-pink` (#E8B1A9), con ~**1.86:1** sobre blanco. WCAG 2.4.7/1.4.11 pide ≥3:1. **Cambio:** outline de 2-3 px sólido `#18252B` o terracota al 100%.
- **Contraste de CTA:** blanco sobre `#a86f5a` = 4.13:1 (texto de 14 px, no llega a 4.5:1). Blanco sobre `purple-400`/`pink-400` = **2.64:1** en "Confirmar y Pagar". Los placeholders `gray-400` sobre blanco dan 2.54:1.
- `button, input { transition: all .2s }` (L30-32): anima propiedades innecesarias. Usar `transition-colors`.
- Clases "neutralizadoras" (`transform:none`, `box-shadow:none` en L46, L52, L57, L73): son restos de estilos anteriores. Eliminar.
- `hidden` + `flex` en el mismo elemento (`checkout.view` L9, `login.view` L9, `cancel-modal` L9). Funciona solo porque Tailwind emite `.hidden` después de `.flex`: frágil ante cualquier CSS propio con `display`.
- **Tipografía:** se usa `font-bold` (700) en 7 lugares y `font-medium` (500) en 5, pero solo se cargan Montserrat 400/600 (medido en `document.fonts`). El navegador sintetiza negritas falsas y el 500 cae a 400. Se pide el peso 300 y nunca se usa. **Cambio:** pedir `wght@400;500;600;700` (o usar `font-semibold` en lugar de `font-bold`) y quitar el 300.
- Micro-texto: `text-[10px]` en mayúsculas con `tracking-[0.18em–0.28em]` (roomCard L12, reservationCard L7, home L11). Legibilidad pobre en móvil. Mínimo recomendable: 11-12 px.
- **Duplicación de strings de clases:** la pill del navbar se repite 3 veces en `navbar.component.js` L20-22 y una 4.ª en `auth.service.js` L38. El input del checkout se repite 5 veces (L18, L22, L28, L33, L37). **Cambio:** clases `.nav-pill` y `.form-input` en `styles.css` (CSS plano, sin cambiar de stack).
- No hay fugas de estilos entre páginas: todo es una sola página y las clases propias tienen nombres únicos.

---

## 6. JavaScript Review

### 6.1 Lo que está bien
- **`booking.service.js` L15-34:** leer, transformar y escribir en la **misma** transacción `readwrite`, con `tx.abort()` ante excepción y `reject(failure || tx.error)`. Es correcto, y las pruebas lo demuestran (10 solicitudes, 2 conexiones, 0 sobreventas; cancelación doble idempotente).
- **`async-list.component.js` L6-23:** contador `version` + `disposed` que evita escrituras obsoletas o tras desmontar. Sencillo y correcto.
- **Doble envío:** `busy` + `disabled` en el checkout (L63-81) y `cancelBusy` en la cancelación (L1-27).
- **Sin fugas de listeners:** `initCheckoutForm`/`initCancelFlow` se llaman una sola vez, `checkinInput.onchange` se reasigna como propiedad (no se acumula) y las listas se montan una sola vez con `||=`.
- `getStoredUser()` protege contra JSON corrupto (auth L8-18). `updateAuthUI` usa `textContent` para el nombre (no hay XSS ahí).
- El servicio re-valida fechas y existencias al guardar, aunque la UI esté desactualizada.

### 6.2 Hallazgos (archivo · línea · tipo)
| # | Ubicación | Tipo | Problema | Cambio |
|---|---|---|---|---|
| J1 | `booking.service.js` L48 | **Bug real** | `crypto.randomUUID()` solo existe en contextos seguros. Ver B-01. | Fallback: `crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2)`. Con `crypto.getRandomValues` (disponible en HTTP) también sirve. |
| J2 | `booking.service.js` L41; `checkout.feature.js` L35, L42, L50 | Duplicación | 4 copias del formateo `YYYY-MM-DD` local. | `Overlook.dates.toLocalISO(date)`. |
| J3 | `booking.service.js` L42-43, L48 | Legibilidad | Líneas de 180-260 caracteres con 5 condiciones encadenadas y un mensaje genérico ("Revisa la sesión y las fechas…") para 5 errores distintos. | Validaciones separadas con mensajes específicos. |
| J4 | `booking.service.js` L43 | **Bug** | Sin límite superior de estancia ni de fecha. Se aceptó 2030-01-01 → 2099-12-31 = 25 566 noches, $53 432 940 (B-14). | `nights <= 30` (o el que decida el equipo) y `checkin <= hoy + 365`. |
| J5 | `booking.service.js` L47 | Número mágico | `86400000`. | `const MS_PER_DAY = 24*60*60*1000`. |
| J6 | `booking.service.js` L29 | Recomendación | `overlook:data-changed` solo se emite en la pestaña que escribe. La otra depende del `focus`. | `BroadcastChannel('overlook')` (Nice to have). |
| J7 | `booking.service.js` L9 | Diseño (documentado) | El inventario se siembra una sola vez, así que editar `rooms.data.js` no tiene efecto hasta borrar la BD. | Aceptable. Documentado en LEEME.md L133-139. |
| J8 | `rooms.data.js` L9-11 | Code smell | `price: '$1890'` y `priceNum: 1890` duplican el dato. Además, `reservation.price` guarda el string. | Guardar solo el número y formatear con `Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'})`. |
| J9 | `checkout.feature.js` L17-18 | **Bug** | Asigna `currentRoomToBook` **antes** de verificar disponibilidad. Si está agotada, el estado queda "sucio". | Asignar solo tras validar. |
| J10 | `checkout.feature.js` L21 | Código innecesario | `currentRoomToBook = { ...currentRoomToBook }` copia sin motivo. | Eliminar. |
| J11 | `checkout.feature.js` L27 | **Bug UX** | Texto "Total a pagar: $X MXN / Noche": no es un total y no se recalcula al cambiar fechas (B-02). | `updateSummary()` en `change` de ambas fechas: "2 noches × $1,890 = $3,780 MXN". |
| J12 | `checkout.feature.js` L48-52 | Bug menor | Si se borra la fecha de llegada, `new Date('T12:00:00')` es inválida y `checkout.min = "NaN-NaN-NaN"` (medido, B-17). | `if (!this.value) return;`. |
| J13 | `checkout.feature.js` L81 | Magic string | Restaura "Confirmar y Pagar" hardcodeado (duplica el template). | Guardar `button.textContent` original antes de cambiarlo. |
| J14 | `checkout.feature.js` L14, L18, L80; `cancel-flow` L25 | UX / smell | `alert()` para todos los errores, incluidos mensajes técnicos. | Mensaje inline con `role="alert"` dentro del formulario o modal. |
| J15 | `checkout.feature.js` L10-58 | Race | `startCheckout` navega a checkout **después** del `await listRooms()` aunque el usuario ya haya navegado a otra vista (medido: clic en Reservar + navegar a "Sobre nosotros" termina en checkout, B-18). | Invalidar `checkoutRequest` desde `navigate()`, o comparar la vista actual antes de navegar. |
| J16 | `auth.service.js` L72-77 + `logout` L82-86 | **Bug** | `currentRoomToBook` no se limpia en logout ni al salir del checkout (botón "Cancelar" L43 de checkout.view). El siguiente usuario que inicia sesión termina en el checkout de la selección del anterior (B-07). | `logout()` y el "Cancelar" del checkout deben hacer `currentRoomToBook = null`. |
| J17 | `auth.service.js` L72-76 | **Bug** | Si la habitación se agotó mientras el usuario iniciaba sesión, `startCheckout` muestra un alert y **el usuario queda en la vista Login ya autenticado** (medido, B-12; `1280-login-atorado-tras-agotada.png`). | En la rama de "sin disponibilidad", `navigate('rooms')`. |
| J18 | `auth.service.js` L47-66 | Smell | Cadena de `if` por proveedor + lectura del DOM dentro del servicio. | Mapa `{Google:{email,nombre},…}` y el valor del email como parámetro. |
| J19 | `auth.service.js` L26-40 | Smell | Elimina y recrea `#btn-mis-reservas` en cada llamada, con clases copiadas. Tras el login hay **dos botones que hacen lo mismo** ("MIS RESERVAS" y "Usuario manual"). | Un botón "Mis reservas" y un menú o botón "Cerrar sesión" en el navbar. |
| J20 | `router.js` L22; `reservations-list` L5 | **Bug menor** | La guarda usa `localStorage.getItem` crudo y la lista usa `JSON.parse` sin try. Con `overlook_user='{}'` se entra a Reservas con el navbar en "INICIAR SESIÓN". Con JSON inválido la lista muestra "Unexpected token 'o'…" (medido, B-20). | `getStoredUser()` en ambos. |
| J21 | `router.js` L24 | Robustez | `document.getElementById('view-'+id).classList` truena si la vista está registrada pero no montada (falta en `VIEW_ORDER`, main L10). | Comprobar null o derivar `VIEW_ORDER` de `Object.keys(Overlook.views)`. |
| J22 | `router.js` L37 | UX | `scrollTo({behavior:'smooth'})` después del render: al cambiar de vista se ve la nueva vista a la altura anterior y luego sube animada. | `behavior:'instant'` y mover el foco al `h1/h2` de la vista. |
| J23 | `router.js` completo | **Bug UX** | No usa `history`/`hash` (medido: `history.length` no cambia, la URL no cambia, recargar lleva a Inicio) (B-05). | `location.hash = '#/rooms'` + `addEventListener('hashchange', …)`. Son ~15 líneas. |
| J24 | `async-list.component.js` L10 | **Bug UX** | Cada `refresh()` reemplaza el contenido por "Cargando…". La página se encoge y el navegador recorta el scroll (medido 939 → 0 px al disparar `focus`) (B-04). | Mostrar "Cargando…" solo en la primera carga. En refrescos, mantener el contenido y usar solo `aria-busy`. |
| J25 | `async-list.component.js` L14-15 | Smell | `innerHTML = ''` seguido de `textContent = empty`. | `if (!items.length) { root.textContent = empty; return; }`. |
| J26 | `async-list.component.js` L18 | Info exposure menor | `error.message` técnico en la UI (p. ej., errores de IndexedDB o JSON). | Mensaje amigable y `console.error(error)`. |
| J27 | `main.js` L23-29 | Redundancia | Al arrancar se renderizan Habitaciones (oculta) y Reservas. Después, cada `navigate('rooms')` vuelve a cargar, y reservar genera 2 recargas de la lista de reservas (medido). | Ver A6. |
| J28 | `main.js` L25 | Smell | `window.refreshOverlook` es otra global. | `Overlook.refresh`. |
| J29 | `cancel-flow.feature.js` L22 y L26 | Smell | `cancelBusy = false` dos veces (la primera solo para que `closeCancelModal` no retorne). | `closeCancelModal({force:true})` o separar `hideModal()`. |
| J30 | `cancel-flow.feature.js` L24-25 | **Bug** | Tras un error (reserva cancelada en otra pestaña) el modal **queda abierto** y la lista no se refresca, así que la tarjeta fantasma sigue ahí (medido, B-10; `375-cancel-cruzado-modal-abierto.png`). | En el `catch`: cerrar el modal y llamar a `renderReservations()`. |
| J31 | `roomCard` L19, `reservationCard` L12 | **Riesgo potencial** | Interpolación de datos dentro de JS inline (`onclick`). Ver R-1. | Atributos `data-*` + delegación. |
| J32 | `reservationCard` L10 | Bug menor | "Total: $1890 / Noche · 1 noches · $1890 MXN": la etiqueta "Total" apunta al precio por noche, "1 noches" sin singular y sin separador de miles (B-15). | `${n} ${n===1?'noche':'noches'}` + `Intl.NumberFormat`. |
| J33 | Encabezados "PIEZA" | Consistencia | 7 archivos nuevos (booking, async-list, roomCard, reservationCard, cancel-flow, rooms-list, reservations-list) no tienen el encabezado Requiere/Expone que sí tienen los demás. La indentación de `roomCard` L3-4 también es inconsistente. | Unificar. |
| J34 | `tests/concurrency.cjs` L13 | Bug de test | La segunda pestaña usa `'http://localhost:8765'` hardcodeado e ignora `OVERLOOK_URL` (L9). | Usar la misma variable. |

### 6.3 Comportamiento ante entradas y flujos atípicos (verificado)
| Escenario | Resultado |
|---|---|
| Email vacío o inválido en login | ✅ `reportValidity()` y foco (auth L59-62) |
| Enter en el email | ❌ No hace nada (B-08) |
| Tarjeta "abcd", vencimiento "zz", CVV "x" | ❌ Reserva confirmada (B-06) |
| Salida ≤ llegada o fecha pasada | ✅ Rechazado por el servicio (alert) |
| Estancia de 70 años | ❌ Aceptada (B-14) |
| Doble clic en "Confirmar y Pagar" / "Sí, Cancelar" | ✅ Una sola operación |
| 10 reservas simultáneas en 2 pestañas con 2 unidades | ✅ Solo 2 éxitos (test) |
| Cancelar dos veces | ✅ La segunda falla; el inventario no se infla |
| Cancelar una reserva ya cancelada en otra pestaña | ⚠️ Mensaje correcto, pero el modal queda abierto y la lista obsoleta (B-10) |
| Botón atrás / recarga | ❌ Sale del sitio / vuelve a Inicio (B-05) |
| Cambiar de pestaña y volver | ❌ Parpadeo + salto de scroll (B-04) |
| Logout → login con otro usuario | ❌ Lo lleva al checkout de la selección previa (B-07) |
| Sin Internet | ❌ Todas las vistas y el modal visibles a la vez (B-03) |
| HTTP por IP de LAN | ❌ Reservar falla (B-01) |

---

## 7. Functional / QA Review

Método: servidor local (`python3 -m http.server`) + Chromium headless (Playwright) con scripts propios fuera del repo (`/workspace/hotel-audit/tools/qa1-4.cjs`), más las 2 pruebas del repo. Se probaron: 320, 360, 375, 740×360 (landscape), 768, 820, 900, 1024 y 1280 px; `file://`; HTTP por IP de LAN; sin CDN (bloqueando Tailwind, Fonts y Unsplash); 2 pestañas.

### 7.1 Recorrido por funcionalidad
| Funcionalidad | Camino feliz | Casos borde |
|---|---|---|
| Navegación | ✅ Cambia de vista y cierra el menú móvil | ❌ Atrás/recarga (B-05); ❌ logo sin teclado (B-24); ❌ navbar de 2 filas en tablet (B-21) |
| Catálogo | ✅ 3 tarjetas, disponibilidad y estado "Agotada" con botón deshabilitado y foto en gris (`1280-rooms-agotada.png`) | ❌ Parpadeo "Cargando…" en cada visita (B-16); ❌ salto de scroll al volver a la pestaña (B-04); ✅ fallback si la imagen falla |
| Login | ✅ Email validado, redirige a Habitaciones o continúa el checkout | ❌ Enter (B-08); ❌ sociales = cuentas compartidas; ❌ glifo Apple (B-11); ❌ queda atorado si la habitación se agotó (B-12) |
| Checkout | ✅ Fechas con `min`, validación en servicio, doble envío bloqueado | ❌ Sin total (B-02); ❌ tarjeta sin validar (B-06); ❌ fechas recortadas en 320 (B-13); ❌ sin límite de estancia (B-14); ❌ sin mensaje de éxito |
| Mis reservaciones | ✅ Lista por usuario, código, fechas y total | ❌ "1 noches" / etiqueta "Total" (B-15); fechas ISO; código UUID de 36 caracteres |
| Cancelación | ✅ Modal de confirmación, inventario +1, idempotente | ❌ Esc/fondo/foco (B-09); ❌ error cruzado deja el modal abierto (B-10); ❌ modal pegado a los bordes (B-22) |
| Logout | ✅ Limpia la sesión y va a Inicio | ❌ No limpia `currentRoomToBook` (B-07); el email previo queda escrito en el input de login |

### 7.2 Lista de bugs (verificados)

#### 🔴 CRITICAL
| ID | Bug | Evidencia / reproducción | Ubicación |
|---|---|---|---|
| **B-01** | **No se puede reservar cuando la app se sirve por HTTP desde otra dirección que no sea `localhost`/`file://`** (celular en la misma red, hosting sin HTTPS). | Abrir `http://172.30.0.2:8765`, iniciar sesión, reservar → alert **"crypto.randomUUID is not a function"** y el usuario queda en checkout. Medido: `isSecureContext=false`, `typeof crypto.randomUUID === 'undefined'`. | `booking.service.js` L48 |

*Por qué CRITICAL:* rompe el flujo principal del producto en un escenario muy probable (probar el diseño responsive en un teléfono real conectándose a la laptop del presentador) y muestra un mensaje técnico. En `localhost`, `file://` y hosting HTTPS (GitHub Pages) **no** ocurre.

#### 🟠 HIGH
| ID | Bug | Evidencia | Ubicación |
|---|---|---|---|
| **B-02** | El checkout **no muestra noches ni total**; el texto "Total a pagar: $1890 MXN / Noche" es engañoso y no cambia con las fechas. | Se cambiaron las fechas a 10 noches y el texto no cambió. El total real solo se ve **después** de pagar. | `checkout.feature.js` L27; `checkout.view.js` L12 |
| **B-03** | **Sin CDN/Internet la app se desarma por completo:** todas las vistas, el modal "¿Cancelar reserva?" y los botones se muestran apilados sin estilo. | `screenshots/1280-sin-internet-cdn.png` (Tailwind, Fonts y Unsplash bloqueados). La clase `hidden`, de la que depende el router, la genera Tailwind. | `index.html` L9; `router.js` L23-24; `styles.css` (no define `.hidden`) |
| **B-04** | Al **recuperar el foco de la ventana** (cambiar de pestaña o app) las listas se vacían con "Cargando…" y el scroll salta al inicio. | Rooms en 375 px con scroll 939 px → `focus` → scroll 0 px. | `main.js` L29; `async-list.component.js` L10 |
| **B-05** | **Sin historial:** el botón atrás abandona la app, recargar vuelve a Inicio y no hay URL por vista. | `history.length` constante y `location.href` siempre `/`. Tras recargar en Habitaciones → `view-home`. | `router.js` L20-38 |

#### 🟡 MEDIUM
| ID | Bug | Evidencia | Ubicación |
|---|---|---|---|
| **B-06** | Los campos de tarjeta aceptan cualquier texto: "abcd", "zz" y "x" dieron "pago" exitoso. No hay `inputmode` ni formato. | Script qa1: reserva creada con esos valores. | `checkout.view.js` L28, L33, L37 |
| **B-07** | **Fuga de estado entre sesiones:** el usuario A abre el checkout de "De Luxe Sea View", pulsa Cancelar y cierra sesión; el usuario B inicia sesión con Google y **aterriza en el checkout de la selección de A**. | qa2: `staleCheckout.view = view-checkout`, título "De Luxe Sea View". | `auth.service.js` L72-77, L82-86; `checkout.view.js` L43 |
| **B-08** | Pulsar **Enter** en el email de login no hace nada (no hay `<form>`). | qa2: `enterLogin.user = null`. | `login.view.js` L15-21 |
| **B-09** | Modal no accesible: Esc no cierra, clic en el fondo no cierra, el foco se queda en el botón de atrás y Tab sale del modal hacia "Cerrar Sesión" y "Cancelar". No hay `role="dialog"`. | qa2: `modalAfterEsc=true`, `tabWhileModal=[Regresar, Sí, Cancelar, Cerrar Sesión, Cancelar, OVERLOOK…]`. | `cancel-modal.component.js` L9-18; `cancel-flow.feature.js` L2-11 |
| **B-10** | Si la reserva ya se canceló en otra pestaña: alert y luego **el modal sigue abierto** y la tarjeta obsoleta permanece. | `375-cancel-cruzado-modal-abierto.png`. | `cancel-flow.feature.js` L24-25 |
| **B-11** | El botón "Apple" muestra un **cuadro vacío (tofu)** en Windows, Android y Linux (usa U+F8FF, un glifo privado de Apple). Ninguno de los 3 botones sociales tiene nombre accesible. | `1280-05-login.png`, `375-05-login.png`. | `login.view.js` L30-32 |
| **B-12** | Si la habitación elegida se agota mientras el usuario inicia sesión: alert "Sin disponibilidad." y **el usuario queda en la vista Login ya autenticado**. | `1280-login-atorado-tras-agotada.png`. | `auth.service.js` L72-76; `checkout.feature.js` L17-18 |
| **B-13** | En 320 px las fechas de llegada y salida se recortan ("09/30/20", "10/01/202"). | `320-06-checkout.png` (inputs de 126 px). | `checkout.view.js` L15-24 |

#### 🟢 LOW
| ID | Bug | Evidencia | Ubicación |
|---|---|---|---|
| B-14 | Sin límite de estancia: 25 566 noches → $53 432 940 aceptados. | qa2 `farFuture`. | `booking.service.js` L43 |
| B-15 | "Total: $1890 / Noche · **1 noches** · $1890 MXN": la etiqueta "Total" apunta al precio por noche, falta el singular y no hay separador de miles. | `375-07-reservas.png`. | `reservationCard.component.js` L10 |
| B-16 | Recargas redundantes: 2 cargas de la lista de reservas por cada reserva y "Cargando…" cada vez que se entra a Habitaciones (parpadeo). | qa2 `loads: 2`, `flickerRooms`. | `main.js` L27; `router.js` L34-36; `cancel-flow` L24 |
| B-17 | Borrar la fecha de llegada deja `checkout.min = "NaN-NaN-NaN"`. | qa2. | `checkout.feature.js` L48-52 |
| B-18 | Clic en "Reservar" + navegar rápido a otra vista → la app **te regresa** al checkout. | qa4 `RACE → view-checkout`. | `checkout.feature.js` L14-58 |
| B-19 | En el menú móvil las pills quedan pegadas: `gap-2`/`flex-col` sin efecto porque `display:block`. | `320-02-menu-abierto.png`. | `navbar.component.js` L19 |
| B-20 | Sesión manipulada: con `'{}'` se entra a Reservas con el navbar en "INICIAR SESIÓN"; con JSON inválido se ve "Unexpected token…". Requiere tocar el localStorage. | qa4. | `router.js` L22; `reservations-list.feature.js` L5 |
| B-21 | Navbar de 2 filas en 768–1023 px (título tapado 3 px); en landscape de 360 px de alto el hero queda 25 px bajo el navbar. | `768-04-rooms.png`, `740x360-home-landscape.png`. | `navbar.component.js` L10-19; `rooms.view.js` L9; `home.view.js` L9 |
| B-22 | Modal sin margen lateral en ≤384 px (pegado a los bordes). | `375-08-modal.png`. | `cancel-modal.component.js` L9-10 |
| B-23 | Placeholder de login truncado en 375 px y sin acento ("DIRECCION"). | `375-05-login.png`. | `login.view.js` L17 |
| B-24 | El logo (volver a Inicio) no se puede activar con el teclado. | qa2: `DIV tabIndex -1`. | `navbar.component.js` L11 |

**Totales:** 🔴 1 · 🟠 4 · 🟡 8 · 🟢 11 = **24 bugs**.

### 7.3 Riesgos para la demo o presentación
1. **Probar en celular por IP** → B-01 (reservar falla). Mitigación inmediata: presentar desde `localhost` o GitHub Pages (HTTPS).
2. **Red del aula caída o lenta** → B-03 (la app se desarma). Tailwind CDN pesa ~398 KB y bloquea el render desde `<head>`.
3. **Alt-Tab a las diapositivas y volver** → parpadeo y la página salta arriba (B-04).
4. **Botón "atrás" del navegador** durante la demo → sale de la app (B-05).
5. **Un evaluador en Windows** ve el botón de Apple vacío (B-11) y la mezcla de estilos morado/rosa/beige.
6. **"¿Cuánto voy a pagar?"** → el checkout no lo dice (B-02).
7. **Datos persistentes entre ensayos:** IndexedDB conserva reservas e inventario. Si en un ensayo se agotó una habitación, en la demo seguirá agotada. Hay que borrar la BD `overlook-async-v1` antes de presentar (LEEME.md L137-139).
8. La consola muestra el aviso de Tailwind "should not be used in production" y un 404 del favicon. Se ve mal si se abre DevTools para enseñar la concurrencia.
9. El tagline "Come and stay forever, and ever, and ever…" y el nombre "Overlook" remiten al hotel embrujado de *El resplandor*. Si es un guiño intencional, está bien; si no, choca con "Refugio wellness & descanso" y está en inglés en un sitio en español.

---

## 8. UI/UX Review

### 8.1 Lo que funciona
- La estética base (beige, terracota, Playfair + Montserrat, tarjetas redondeadas) es coherente **en Inicio, Sobre nosotros y Habitaciones** y transmite "hotel boutique" (`1280-01-home.png`, `1280-rooms-agotada.png`).
- La tarjeta de habitación es clara: foto, capacidad, precio, disponibilidad y CTA. El estado agotado es evidente (gris + "Sin disponibilidad").
- El modal de cancelación tiene buen copy ("Esta acción liberará la habitación y no se puede deshacer").
- El CTA de guardado cambia a "Guardando…" (feedback de carga en el submit).

### 8.2 Problemas por pantalla (qué cambiar exactamente)
**Inicio (`home.view.js`)**
- Un hotel sin **ninguna foto** en la portada: solo una tarjeta de texto sobre beige. **Cambiar:** usar como fondo del hero una de las imágenes que ya existen (con overlay) y conservar la tarjeta.
- Hay 3 textos que compiten: la etiqueta "Refugio wellness & descanso", el `h1` y un tagline en inglés. **Cambiar:** tagline en español con propuesta de valor ("Frente al mar · Spa · Gastronomía").
- No hay footer (dirección, contacto, redes, aviso de demo). **Agregar** un footer simple y común a todas las vistas.

**Navbar**
- Las pills son todas iguales: no hay jerarquía, ni CTA principal, ni estado activo.
- Tras iniciar sesión aparecen "MIS RESERVAS" y "Usuario manual", que **hacen lo mismo**. "Cerrar sesión" solo existe dentro de Reservas.
- **Cambiar:** "Habitaciones" | "Nosotros" | [Mis reservas] | botón primario "Reservar"; el nombre del usuario con opción "Cerrar sesión"; `aria-current` + subrayado en la vista activa.

**Habitaciones**
- La capacidad está en inglés y en mayúsculas de 10 px ("2 ADULTS | 1 CHILD BELOW 7"). **Cambiar:** "2 adultos · 1 niño (<7)" a 12 px.
- "Desde $1890 por noche": "Desde" sugiere un precio variable que no existe y falta la moneda. **Cambiar:** "$1,890 MXN / noche".
- "Disponibles: 5" es inventario global, no por fechas. El usuario podría creer que hay 5 libres en *sus* fechas. **Cambiar** la etiqueta a "Unidades en inventario: 5", o pedir las fechas antes de mostrar la disponibilidad (a futuro).
- No se puede elegir fechas antes de elegir habitación: es el flujo inverso al habitual de un hotel. Aceptable para el alcance, pero conviene mencionarlo.

**Login (`1280-05-login.png`)**
- **Rompe la identidad:** fondo morado radial, tarjeta translúcida lila, ícono "✦", botones sociales morados. **Cambiar** a la paleta beige/terracota del resto.
- Los botones sociales inician sesión al instante como cuentas **compartidas** (`invitado@gmail.com`) sin avisar que es una demo. **Cambiar:** etiqueta "Acceso demo" o quitarlos; si se quedan, `aria-label` y logos SVG reales (no el glifo U+F8FF).
- El separador "O USA OTRA OPCIÓN" ocupa 2 líneas con líneas decorativas de ancho fijo (`w-1/4`). **Cambiar** a `flex-1` en las líneas y un texto corto ("o").

**Checkout (`1280-06-checkout.png`, `320-06-checkout.png`)**
- No hay resumen de reserva (foto, habitación, fechas, noches, total). Es **el problema de UX más grave** (B-02). **Agregar** un bloque de resumen que se recalcule en vivo.
- Solo el número dice "(Simulado)". **Agregar** un aviso visible arriba del formulario: "Demo: no ingreses datos reales de tarjeta".
- CTA con degradado morado→rosa (contraste 2.64:1), distinto de todos los demás CTA terracota. **Cambiar** a `luxury-button`.
- "Cancelar" (link gris) es ambiguo junto a "Cancelar reserva" de otras pantallas. **Cambiar** a "← Volver a habitaciones".
- Tras reservar no hay confirmación: se salta a la lista sin decir "¡Reserva confirmada!". **Agregar** un mensaje de éxito (banner en Mis reservaciones durante unos segundos, con `role="status"`).

**Mis reservaciones (`375-07-reservas.png`)**
- "CÓDIGO: RES-FCE53A9F-9B34-…" son 40 caracteres en mayúsculas que ocupan 2 líneas en móvil. **Cambiar:** mostrar los primeros 8 caracteres ("RES-FCE53A9F") y copiar el completo con `title`.
- Las fechas en ISO ("2026-09-30"). **Cambiar:** `toLocaleDateString('es-MX', {day:'numeric', month:'short', year:'numeric'})` → "30 sep 2026". Cuidado de interpretar la fecha como local (`'T12:00'`).
- La línea de total es confusa (B-15). **Cambiar:** "$1,890 MXN × 2 noches = **$3,780 MXN**".
- El estado vacío es texto plano sin acción. **Agregar** "Aún no tienes reservas" + botón "Ver habitaciones".
- Hay inconsistencia de términos: "Mis Reservaciones" (título), "MIS RESERVAS" (navbar), "reserva" (modal). Elegir uno.
- El botón "Cerrar Sesión" está al lado del título de la página. Pertenece al navbar.

**Transversales**
- **Estados de carga:** "Cargando…" en texto plano que reemplaza el contenido (parpadeo). **Cambiar:** esqueleto o mantener el contenido anterior (B-04, B-16).
- **Errores:** `alert()` nativo con mensajes técnicos. **Cambiar:** mensaje inline junto a la acción.
- **Mayúsculas:** se mezclan MAYÚSCULAS con tracking (nav, CTAs), Title Case ("Confirmar y Pagar", "Cerrar Sesión") y oración ("Inicia sesión"). **Unificar** en oración para botones secundarios y MAYÚSCULAS solo en CTAs principales, o como el equipo decida, pero de forma consistente.
- **Accesibilidad:** foco casi invisible (`1280-focus-visible-debil.png`), labels no asociados, modal sin gestión de foco, al cambiar de vista el foco no se mueve al título y el logo no es accesible con el teclado.
- **Móvil:** fechas recortadas, modal pegado a los bordes, pills pegadas y navbar de 2 filas en tablet (sección 5.5).

**Qué se ve "amateur" o desactualizado:** la mezcla de 3 paletas, los `alert()` del navegador, el botón Apple vacío, la portada sin foto, los micro-textos de 10 px en inglés y un checkout que "cobra" sin mostrar el total. Todo se arregla con cambios pequeños, sin tocar la arquitectura.

---

## 9. Security Review

El proyecto es una demo 100% en el cliente, sin backend, sin credenciales y sin pagos reales. **No se encontraron secretos, tokens ni datos sensibles en el repo** (revisados los 32 archivos; `.gitignore` excluye `.env*`). Los datos de tarjeta **no se guardan**: los inputs no tienen `name` y el servicio no los recibe (`checkout.feature.js` L74-76). Eso está bien.

| ID | Tipo | Hallazgo | Condición de explotación | Recomendación |
|---|---|---|---|---|
| **R-1** | **POTENTIAL RISK – XSS en contexto de atributo/JS** | `safeRecord` escapa las entidades HTML, pero el HTML parser **decodifica** `&#39;` antes de ejecutar el `onclick`. Además, los campos **no string** (`room.id`) no se escapan. Verificado: con `id = "x');__pwned.push(1);//"` en `reservationCard` y `id = "1);__pwned.push(1);//"` en `roomCard`, el código se ejecutó al hacer clic (`__pwned = ['reservationCard','roomCard']`). | Hoy **no es explotable**: los IDs los genera el propio servicio (`RES-uuid` y números fijos), así que solo sería self-XSS vía DevTools. **Se vuelve real** en cuanto se conecte la API de otro equipo, como propone LEEME.md L121-131, si esta devuelve IDs controlables por terceros. | `data-room-id="${escape(id)}"` + listener delegado que lea `dataset`. Eliminar los `onclick` inline de las tarjetas. |
| **R-2** | POTENTIAL RISK – Supply chain | `https://cdn.tailwindcss.com` **sin versión fija** (302 → `3.4.17`) y sin SRI. Es un script de terceros con acceso total al DOM. | Si el CDN cambia de versión o se compromete, el sitio ejecuta lo que sirva. Un cambio de versión mayor puede romper estilos sin tocar el repo. | Fijar la versión (`https://cdn.tailwindcss.com/3.4.17`) como mínimo; idealmente compilar con Tailwind CLI (sección 15). |
| **R-3** | Diseño (documentado) – Autenticación simulada | La identidad es un email en `localStorage`. `listReservations(email)` y `cancel(id,email)` confían en él (`booking.service.js` L38, L55). | Cualquiera con acceso al navegador puede escribir otro email y ver o cancelar sus reservas. Los botones sociales comparten cuentas (`invitado@gmail.com`). | Aceptable para la demo y **bien documentado** (LEEME.md L125-127). Al integrar la API, la identidad debe venir del servidor. |
| **R-4** | Recomendación – Formulario de tarjeta | Pide número, vencimiento y CVV reales en apariencia, sobre HTTP en desarrollo, con solo "(Simulado)" en un label. | Un usuario de prueba podría teclear su tarjeta real. No se envía ni se guarda, pero queda en memoria del DOM y puede quedar en el autocompletado del navegador. | Banner "DEMO", `autocomplete="off"` en los 3 campos y placeholders obviamente ficticios. |
| **R-5** | Info exposure (baja) | Se muestran mensajes técnicos: `error.message` en las listas (`async-list` L18) y en alerts ("crypto.randomUUID is not a function", "Unexpected token…"). | Solo revela detalles de implementación. | Mensajes amigables + `console.error`. |
| **R-6** | Dependencia de recursos externos | Imágenes con hotlink a Unsplash (`rooms.data.js` L9-11). | Si Unsplash cambia o elimina la URL, desaparecen las fotos. Hay fallback (`roomCard` L7-8), bien. | Opcional: copiar las 3 imágenes (optimizadas) al repo. |

Otros puntos revisados sin hallazgo: no se usa `eval`/`new Function`; `innerHTML` solo recibe templates propios o datos escapados; el nombre de usuario se pinta con `textContent` (auth L32); no hay URLs dinámicas en `href`; `localStorage` solo guarda `{email, nombre}`. La validación de entradas en el servicio (fechas, existencia, titularidad) es correcta para su alcance.

---

## 10. Performance Review

Mediciones locales (Chromium, 1280×800, sin caché): **FCP ≈ 828 ms, DOMContentLoaded ≈ 814 ms, load ≈ 1.57 s**, 161 nodos DOM y 35 peticiones.

| Recurso | Peso | Observación | Optimización real |
|---|---|---|---|
| Tailwind CDN (JIT en el navegador) | **~398 KB** JS, parser-blocking en `<head>` | Genera CSS en runtime (~18.5 KB de `<style>`) y observa el DOM, así que re-escanea con cada `innerHTML`. Es **el mayor costo** y además provoca B-03. | Compilar una sola vez con Tailwind CLI a `css/tailwind.css` (mismo Tailwind, mismas clases) → ~10-15 KB. Si no, al menos fijar la versión. |
| 3 imágenes Unsplash | 65 + 84 + 90 = **~240 KB** | Llegan a **1170×780** y se muestran a **355×208** (≈3.3× en DPR1). **Se descargan al cargar Inicio** porque la lista de habitaciones se renderiza al arrancar (`main.js` L26), aunque esté oculta. | `&w=720` + `srcset` (480/720/1080) + `sizes`, y `loading="lazy" decoding="async"` en `roomCard` L7. |
| Google Fonts | 10 KB CSS + 3 woff2 (~96 KB) | Sin `preconnect`. Se pide el peso 300 y no se usa. Faltan 500 y 700, que se sintetizan. | `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`; pedir los pesos usados. |
| 25 scripts locales | ~40 KB en total | Uno es un comentario vacío (`storage-init.js`). Sin `defer` (están al final del `<body>`, así que el impacto es bajo). | Quitar `storage-init.js`. No hace falta un bundler. |
| Refrescos | — | `focus` → 2 lecturas de IndexedDB + re-render completo + re-escaneo de Tailwind. Doble recarga tras reservar o cancelar. | Ver A6/J24. |
| IndexedDB | Blob único `hotel` | Cada operación lee y escribe **todo** el estado (habitaciones + reservas de todos). Es O(n), irrelevante a esta escala, y es lo que hace trivial la atomicidad. | Mantener. Documentar el límite. |
| `backdrop-blur` en navbar fijo y modal | — | Costo de GPU en móviles modestos. | Aceptable; opcional usar un fondo opaco en el navbar. |

No hay operaciones repetidas costosas, listeners acumulados ni fugas de memoria detectables.

---

## 11. Maintainability Review

**A favor:** archivos pequeños (el mayor tiene 86 líneas), nombres descriptivos por responsabilidad, contratos documentados en LEEME.md (tabla de catálogo L22-36), pruebas automatizadas del servicio y de concurrencia que pasan, y comentarios que explican el *porqué* (p. ej., `booking.service.js` L1-2, `async-list` L1-3).

**En contra:**
1. **Orden de scripts como contrato implícito:** 25 `<script>` donde un cambio de orden rompe en runtime (`defaultRooms`, `getStoredUser`, `currentRoomToBook` como globales léxicas). No hay ni un chequeo.
2. **Globales mezcladas:** `window.Overlook.*` y funciones sueltas en `window` (`navigate`, `startCheckout`, `openCancelModal`, `logout`, `loginGenerico`, `renderRooms`, `renderReservations`, `refreshOverlook`, `toggleNavMenu`, `initCheckoutForm`, `initCancelFlow`, `closeCancelModal`) más `let`/`const` de nivel superior (`currentRoomToBook`, `reservationToCancel`, `defaultRooms`, `cancelBusy`, `checkoutRequest`, `roomsListComponent`, `reservationsListComponent`, `getStoredUser`, `updateAuthUI`).
3. **Diseño sin tokens:** 40 hex literales y dos paletas contradictorias (5.2). Cambiar el color de marca implica editar 10+ archivos.
4. **Documentación divergente:** `LEEME-original.md` describe otra versión (localStorage, 21 piezas, `#FF99D6`, "doble clic", comprobaciones que ya fallan como `JSON.parse(localStorage.overlook_rooms)`). Un integrador que lo siga se equivocará. Los comentarios "PASO n" de `index.html` y los encabezados "PIEZA" están incompletos (J33).
5. **Estilo de código inconsistente:** mezcla de archivos formateados y "one-liners" densos (`booking.service.js`, `async-list.component.js`, `cancel-flow.feature.js`). No hay `package.json` con scripts (`npm test`), aunque haya tests.
6. **Mensajes y textos hardcodeados** repartidos (alert strings, "Confirmar y Pagar" duplicado, "Cargando…").

Deuda técnica estimada: **baja-media**. Se paga en 2-3 días de trabajo de una persona sin reescribir nada.

---

## 12. Senior Developer Recommendations — "Cosas que un Senior Developer cambiaría"

**SD-1. Generador de ID que no dependa de contexto seguro**
- **Problema:** `booking.service.js` L48, `crypto.randomUUID()`.
- **Por qué está mal:** la API no existe en HTTP fuera de localhost, así que el flujo principal falla (B-01).
- **Cambio:** `const newId = () => crypto.randomUUID ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2,'0')).join('');` (`getRandomValues` sí existe en HTTP) y usar `'RES-' + newId()`.
- **Prioridad:** CRITICAL. **Impacto:** la reserva funciona en cualquier dispositivo de la red.

**SD-2. Resumen de reserva calculado en vivo**
- **Problema:** `checkout.feature.js` L26-27 y L47-56; `checkout.view.js` L11-12.
- **Por qué está mal:** se confirma el pago sin ver el total; la etiqueta dice "Total" pero es por noche (B-02).
- **Cambio:** función `updateSummary()` llamada en `startCheckout` y en `change` de ambas fechas. Muestra "N noche(s) × $precio = $total MXN" con `Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'})`, y reutiliza la misma función de noches que el servicio (`core/dates.js`).
- **Prioridad:** HIGH. **Impacto:** el flujo de compra se vuelve comprensible y la demo es creíble.

**SD-3. Refrescar sin destruir el contenido**
- **Problema:** `async-list.component.js` L10 y `main.js` L27-29.
- **Por qué está mal:** vaciar la lista en cada refresco provoca parpadeo y salto de scroll (B-04, B-16).
- **Cambio:** `let loaded = false;` y solo `if (!loaded) root.textContent = 'Cargando…';`; al terminar, `loaded = true`. Quitar el `renderReservations()` explícito de `cancel-flow` L24 (ya lo cubre `data-changed`). En `focus`, refrescar solo si `document.visibilityState === 'visible'` y han pasado más de N segundos, o sustituirlo por `BroadcastChannel`.
- **Prioridad:** HIGH. **Impacto:** navegación estable en móvil; menos trabajo del navegador.

**SD-4. Router con hash e historial**
- **Problema:** `router.js` L20-38; los botones del navbar y del home usan `onclick="navigate(...)"`.
- **Por qué está mal:** el botón atrás abandona la app, recargar pierde la vista y no hay URLs (B-05).
- **Cambio:** `navigate(id)` → `location.hash = '#/' + id`. `window.addEventListener('hashchange', () => show(location.hash.slice(2) || 'home'))`. Al arrancar, `show(fromHash)`. Links como `<a href="#/rooms">`. Mantener la guarda de `reservations` con `getStoredUser()`. El checkout sin habitación seleccionada redirige a `rooms`.
- **Prioridad:** HIGH. **Impacto:** comportamiento web esperado y enlaces compartibles, con ~20 líneas.

**SD-5. Tailwind sin dependencia frágil del CDN**
- **Problema:** `index.html` L9; `styles.css` sin `.hidden`.
- **Por qué está mal:** sin red, la app se desarma (B-03); la versión no está fija (R-2); cuesta ~398 KB.
- **Cambio mínimo (MUST):** fijar `https://cdn.tailwindcss.com/3.4.17` y agregar en `styles.css` `.hidden{display:none!important}` como red de seguridad, para que al menos las vistas no se apilen. **Cambio completo (NICE):** `npx tailwindcss -i css/input.css -o css/tailwind.css --minify` usando el mismo `tailwind.config.js` (con `content: ['./index.html','./js/**/*.js']`).
- **Prioridad:** HIGH. **Impacto:** demo resistente a la red y carga más rápida.

**SD-6. Estado de flujo con ciclo de vida**
- **Problema:** `core/state.js` L8-9; `auth.service.js` L72-86; `checkout.feature.js` L17-21; `checkout.view.js` L43.
- **Por qué está mal:** la selección de habitación sobrevive a logout y cancelaciones y se filtra al siguiente usuario (B-07, B-12).
- **Cambio:** `Overlook.state = { roomToBook:null, reservationToCancel:null, reset(){…} }`; `logout()` llama a `reset()`; el "Cancelar" del checkout hace `roomToBook = null` antes de navegar; `startCheckout` asigna solo si hay disponibilidad y, si no, `navigate('rooms')`.
- **Prioridad:** MEDIUM. **Impacto:** se eliminan redirecciones inesperadas.

**SD-7. Delegación de eventos en lugar de `onclick` inline en las tarjetas**
- **Problema:** `roomCard.component.js` L19, `reservationCard.component.js` L12 (y 14 `onclick` más en las vistas).
- **Por qué está mal:** el escape HTML no protege el contexto JS (R-1, verificado), obliga a tener globales y bloquea una CSP.
- **Cambio:** `<button data-action="book" data-room-id="${id}">` y en `rooms-list.feature.js` un solo `container.addEventListener('click', e => { const b = e.target.closest('[data-action="book"]'); if (b) startCheckout(Number(b.dataset.roomId)); })`. Igual para `cancel`. Las vistas estáticas pueden conservar `onclick` al principio y migrarse después.
- **Prioridad:** MEDIUM (pasa a HIGH al conectar una API externa). **Impacto:** seguridad al integrar y menos globales.

**SD-8. Formularios semánticos y accesibles**
- **Problema:** `login.view.js` L15-21; `checkout.view.js` L15-38.
- **Por qué está mal:** Enter no envía el login (B-08), los labels no están asociados (H1) y la tarjeta acepta cualquier cosa (B-06).
- **Cambio:** envolver el login en `<form id="login-form">`, `label for` + `id` en los 6 campos, `autocomplete`, `inputmode="numeric"`, `pattern="\d{4} ?\d{4} ?\d{4} ?\d{4}"`, `pattern="(0[1-9]|1[0-2])\/\d{2}"`, `pattern="\d{3,4}"` y `title` con el mensaje.
- **Prioridad:** MEDIUM. **Impacto:** accesibilidad, teclado y una validación mínima creíble.

**SD-9. Modal accesible y robusto**
- **Problema:** `cancel-modal.component.js` L9-18; `cancel-flow.feature.js` L2-27.
- **Por qué está mal:** no hay Esc, foco, clic en fondo ni `role`; tras un error queda abierto con datos obsoletos (B-09, B-10).
- **Cambio:** `role="dialog" aria-modal="true" aria-labelledby="cancel-title"`; al abrir, guardar `document.activeElement` y enfocar "Regresar"; `keydown Escape` → cerrar; clic en el overlay (`e.target === modal`) → cerrar; al cerrar, devolver el foco; en el `catch`, cerrar el modal y `renderReservations()`; `mx-4` en el panel. (Opcional: `<dialog>` nativo, soportado en todos los navegadores actuales, que resuelve foco y Esc solo.)
- **Prioridad:** MEDIUM. **Impacto:** accesibilidad y consistencia de datos.

**SD-10. Una sola paleta y tokens**
- **Problema:** `styles.css` L1-14 vs `tailwind.config.js` L11-25; 40 hex en templates; login y checkout con colores ajenos.
- **Por qué está mal:** dos fuentes de verdad con valores distintos; imposible de mantener; UI inconsistente (5.2-5.3).
- **Cambio:** definir la paleta final en `tailwind.config.js` (bg, surface, ink, muted, primary=terracota, primary-hover, danger, success), reemplazar `text-[#1d1d1b]` → `text-overlook-ink`, etc., borrar las variables CSS sin uso y `.soft-shell`, y reestilizar login, CTA del checkout, tarjeta de reserva y modal con esos tokens.
- **Prioridad:** MEDIUM. **Impacto:** identidad visual coherente; los cambios de marca se hacen en un solo archivo.

**SD-11. Separar responsabilidades de auth/router/navbar**
- **Problema:** `auth.service.js` L21-45, L56, L72-79; `router.js` L9-18, L22, L34-36.
- **Por qué está mal:** hay servicios que tocan el DOM y un router que conoce features (A1, A2).
- **Cambio:** `auth.service` puro (get/login/logout + evento `overlook:auth-changed`); `navbar.feature.js` escucha ese evento y re-renderiza los links; el router expone `onEnter(viewId, fn)` y cada feature se registra.
- **Prioridad:** MEDIUM. **Impacto:** menos acoplamiento; agregar vistas sin tocar el router.

**SD-12. Utilidades compartidas (fechas, dinero, html)**
- **Problema:** 4 copias del formateo de fechas (`booking.service.js` L41, `checkout.feature.js` L35/L42/L50); `escape`/`safeRecord` dentro de `async-list.component.js` L26-27; `price`/`priceNum` duplicados.
- **Por qué está mal:** duplicación y baja cohesión.
- **Cambio:** `core/utils.js` con `toLocalISO`, `addDays`, `nightsBetween`, `formatMXN`, `formatDate`, `escape`, `safeRecord`; eliminar `price` string de `rooms.data.js`.
- **Prioridad:** LOW. **Impacto:** un solo lugar para reglas y formato.

**SD-13. Límites de negocio en el servicio**
- **Problema:** `booking.service.js` L43.
- **Por qué está mal:** acepta estancias de décadas (B-14).
- **Cambio:** `const MAX_NIGHTS = 30, MAX_ADVANCE_DAYS = 365;` y errores específicos por regla.
- **Prioridad:** LOW. **Impacto:** datos coherentes; la demo no queda en ridículo.

**SD-14. Responsive: navbar sticky y breakpoints intermedios**
- **Problema:** `navbar.component.js` L9-19; `pt-24/pt-28` en las 5 vistas; `md:grid-cols-3` en rooms y about.
- **Por qué está mal:** hay solapamientos en tablet y landscape (B-21), pills pegadas en móvil (B-19) y tarjetas apretadas en 768 px.
- **Cambio:** `sticky top-0` en el navbar y quitar los `pt-*` compensatorios; `lg:flex` para el menú de escritorio (hamburguesa hasta 1023 px); en móvil alternar `hidden`↔`flex`; rejillas `sm:grid-cols-2 lg:grid-cols-3`; fechas `grid-cols-1 sm:grid-cols-2`; tarjeta del checkout `p-5 sm:p-8`.
- **Prioridad:** MEDIUM. **Impacto:** layout correcto de 320 a 1440 px.

**SD-15. Limpieza de documentación y restos**
- **Problema:** `LEEME-original.md`, `index.base.html`, `js/core/storage-init.js`, comentarios "PASO" de `index.html` L22-59, comentario antes del doctype (L1).
- **Por qué está mal:** confunde al equipo receptor (instrucciones que ya no funcionan).
- **Cambio:** mover `LEEME-original.md` a `docs/historial/` con un aviso "obsoleto" (o eliminarlo), borrar `storage-init.js` y su `<script>`, actualizar los comentarios de pasos y agregar un `package.json` mínimo con `"test": "node tests/service.cjs"`.
- **Prioridad:** LOW. **Impacto:** onboarding correcto del otro equipo.

---

## 13. MUST CHANGE (prioritized)

Sin estos cambios el producto falla en escenarios probables o la demo corre un riesgo claro.

1. **B-01 / SD-1:** fallback de ID para contextos no seguros (`booking.service.js` L48).
2. **B-03 / SD-5 (mínimo):** fijar la versión de Tailwind CDN y agregar `.hidden{display:none!important}` en `styles.css`. Ensayar la demo con la red real del lugar.
3. **B-02 / SD-2:** resumen en vivo con noches y total en el checkout; corregir la etiqueta "Total a pagar … / Noche".
4. **B-04 / SD-3:** que el refresco por `focus` y `data-changed` no vacíe las listas; quitar la recarga duplicada.
5. **B-05 / SD-4:** navegación por `hash` con soporte de atrás/adelante y recarga.
6. **B-07 + B-12 / SD-6:** limpiar `currentRoomToBook` en logout y en "Cancelar" del checkout; si la habitación ya no está disponible tras el login, navegar a Habitaciones.
7. **B-08 + H1 / SD-8 (parte a11y):** login dentro de `<form>` (Enter funciona) y `label for`/`id` en los 6 campos.
8. **B-10 / SD-9 (parte datos):** en error de cancelación, cerrar el modal y refrescar la lista.
9. **B-11:** reemplazar el glifo U+F8FF del botón Apple (texto "Apple" o SVG) y agregar `aria-label` a los 3 botones sociales.

## 14. SHOULD CHANGE (prioritized)

Mejoran de forma notable la calidad, la accesibilidad y la mantenibilidad; no bloquean la demo.

1. **SD-7 / R-1:** delegación con `data-*` en `roomCard` y `reservationCard` (**obligatorio antes de conectar la API externa**).
2. **SD-9 (resto) / B-09 / B-22:** modal con `role="dialog"`, Esc, clic en el fondo, foco inicial y de retorno, y `mx-4`.
3. **B-06 / SD-8 (resto) / R-4:** `inputmode`, `pattern`, `autocomplete` en los campos de tarjeta y banner "DEMO: no uses datos reales".
4. **SD-14 / B-13 / B-19 / B-21:** navbar `sticky` + `lg:` para escritorio, `hidden`↔`flex` en móvil, rejillas `sm:2 lg:3`, fechas apiladas en móvil.
5. **Foco visible y contraste (5.6):** outline sólido ≥3:1; CTA del checkout a `luxury-button`; oscurecer el terracota del texto de botón o subir su peso y tamaño para llegar a 4.5:1.
6. **SD-10:** una sola paleta en `tailwind.config.js`; reestilizar login, checkout, tarjeta de reserva y modal con la identidad beige/terracota; eliminar variables y clases muertas.
7. **Reemplazar `alert()`** por mensajes inline con `role="alert"`/`role="status"` y un mensaje de éxito tras reservar (J14, 8.2).
8. **B-15 / SD-12:** `Intl.NumberFormat` para MXN, singular/plural de noches, fechas legibles en es-MX, código de reserva corto.
9. **SD-11:** sacar la manipulación del DOM de `auth.service.js` y las features del router; un solo acceso a la sesión (`getStoredUser`) → corrige B-20.
10. **Rendimiento de imágenes (10):** `loading="lazy"`, `w=720` + `srcset`; `preconnect` a las fuentes y pesos correctos (400/500/600/700; quitar el 300).
11. **B-24 / H4 / H11:** logo y links como `<a href="#/…">`, `aria-current` y estilo activo en el navbar; mover el foco al título al cambiar de vista.
12. **B-14, B-17, B-18 / SD-13:** límites de estancia, guarda de fecha vacía e invalidación de `startCheckout` al navegar.
13. **SD-15:** limpiar `LEEME-original.md`, `storage-init.js` y comentarios de pasos; unificar los encabezados "PIEZA".

## 15. NICE TO HAVE (prioritized)

Valor agregado; hacerlo solo si sobra tiempo.

1. Compilar Tailwind con la CLI (`css/tailwind.css` minificado) y retirar el CDN.
2. `BroadcastChannel` para sincronizar pestañas sin depender del `focus` (J6).
3. Hero con fotografía, footer común (contacto, ubicación, aviso de demo), copy de "Sobre nosotros" con imágenes.
4. Traducir los datos de las habitaciones y el tagline al español (o marcar `lang="en"`); revisar el guiño a *El resplandor* según el tono deseado.
5. `meta description`, favicon y Open Graph.
6. `package.json` con `npm test` (service + concurrency) y `npm run serve`.
7. Estado vacío con CTA en Mis reservaciones y orden por fecha de llegada.
8. Copiar las 3 imágenes al repo en WebP optimizado (sin depender del hotlink).
9. Mover el comentario anterior al `<!DOCTYPE>` y detalles menores de indentación.

---

## 16. Recommended Improvement Roadmap (ordered steps)

Cada paso es independiente y verificable. Tras cada uno: `node tests/service.cjs` y `node tests/concurrency.cjs` + revisión visual en 320/375/768/1280.

**Fase 0 — Blindaje de demo (≈ 1-2 h)**
1. `booking.service.js` L48: agregar el fallback `newId()`. *Verificar:* reservar desde `http://<IP-LAN>:8000` en un teléfono.
2. `index.html` L9: fijar `cdn.tailwindcss.com/3.4.17`; `styles.css`: `.hidden{display:none!important}`. *Verificar:* con DevTools "Offline" solo se ve una vista.
3. `login.view.js` L31: sustituir U+F8FF; agregar `aria-label` a los sociales.
4. Antes de presentar: borrar la BD `overlook-async-v1` del navegador de demo.

**Fase 1 — Flujo de reserva correcto (≈ 3-4 h)**
5. Crear `js/core/utils.js` (fechas, MXN, escape/safeRecord) y cargarlo después de `registry.js`. Reemplazar las 4 copias del formateo de fechas.
6. `checkout.view.js`: bloque de resumen (`#checkout-summary`); `checkout.feature.js`: `updateSummary()` en `startCheckout` y en `change` de ambas fechas.
7. `booking.service.js` L43: `MAX_NIGHTS` y `MAX_ADVANCE_DAYS` con mensajes específicos.
8. `reservationCard` L10: total legible, singular/plural y fechas es-MX.
9. `state.js` → `Overlook.state` con `reset()`; `logout()` lo llama; el "Cancelar" del checkout limpia la selección; `startCheckout` sin disponibilidad → `navigate('rooms')`.
10. Mensaje de éxito tras reservar (banner `role="status"` en Mis reservaciones).

**Fase 2 — Navegación y refrescos (≈ 2-3 h)**
11. `router.js`: hash routing (`hashchange`, arranque desde el hash, guarda con `getStoredUser`). Links `<a href="#/…">` en navbar, logo y home.
12. `async-list.component.js`: loader solo en la primera carga. `main.js`: `focus` condicionado; quitar la recarga duplicada de `cancel-flow` L24.
13. Invalidar `checkoutRequest` desde el router (B-18).

**Fase 3 — Formularios y modal accesibles (≈ 2-3 h)**
14. Login en `<form>`; `label for`/`id`/`autocomplete` en los 6 inputs; `inputmode`/`pattern` en la tarjeta; banner "DEMO".
15. Modal: `role`/`aria-*`, Esc, clic en el fondo, gestión del foco, `mx-4`; en error, cerrar y refrescar.
16. Reemplazar los 4 `alert()` por mensajes inline.

**Fase 4 — Responsive y sistema visual (≈ 4-6 h)**
17. Navbar `sticky` + `lg:` + `hidden`↔`flex`; quitar `pt-24/pt-28`; rejillas `sm:2 lg:3`; fechas apiladas en móvil; padding responsive del checkout.
18. Consolidar la paleta en `tailwind.config.js`; reemplazar los hex por tokens; borrar el `:root` sin uso, `.soft-shell` y los neutralizadores.
19. Rediseñar login, CTA del checkout, tarjeta de reserva y modal con la paleta de marca.
20. Foco visible sólido, contraste de CTAs, micro-textos ≥ 11-12 px, pesos de fuente correctos + `preconnect`.
21. Clases `.nav-pill` y `.form-input` para eliminar los strings duplicados.

**Fase 5 — Arquitectura y limpieza (≈ 3-4 h)**
22. Delegación de eventos con `data-*` en las tarjetas (R-1); después, en las vistas.
23. `auth.service` sin DOM + evento `overlook:auth-changed`; `navbar.feature.js` para el menú y los links de sesión; hooks `onEnter` en el router.
24. `getStoredUser()` como único acceso a la sesión.
25. Imágenes `lazy` + `srcset`.
26. Limpieza: `storage-init.js`, `LEEME-original.md`, comentarios de pasos, encabezados "PIEZA", `package.json` con scripts, fix de `tests/concurrency.cjs` L13.

**Fase 6 — Opcional**
27. Tailwind CLI, `BroadcastChannel`, hero con foto + footer, SEO básico, i18n de datos.

---

## 17. Final Assessment

**Lo bueno.** El equipo resolvió bien la parte técnicamente más difícil: la **concurrencia de reservas**. Hay una transacción IndexedDB atómica que impide la sobreventa entre pestañas, cancelación idempotente, control de respuestas obsoletas en las listas y protección contra doble envío, y todo tiene **pruebas que pasan** (verificado en esta auditoría). La organización por carpetas es clara, los archivos son pequeños, el LEEME es honesto sobre las limitaciones y el escape HTML existe. No hay secretos, ni dependencias de npm en runtime, ni overflow horizontal, ni IDs duplicados. La estética base (beige/terracota/Playfair) tiene buen gusto.

**Lo malo.**
- **La capa de experiencia no está a la altura del núcleo.** El checkout "cobra" sin mostrar el total, la navegación ignora el historial, las listas parpadean y hacen saltar el scroll, y tres paletas conviven en la misma app.
- **La accesibilidad es insuficiente:** labels sin asociar, modal sin foco ni Esc, foco invisible y un logo sin teclado.
- **Hay fragilidad de entorno:** la app se rompe sin CDN y la reserva falla al servirse por IP en HTTP.
- **El estado global se filtra entre sesiones.**

**Deuda técnica:** baja-media. La mayor parte es de UI/UX y de acoplamiento (router ↔ features, servicio ↔ DOM, handlers inline), no de lógica de datos. Se puede pagar incrementalmente sin reescribir ni cambiar de stack.

**Qué cambiar primero:** la Fase 0 del roadmap (fallback de UUID, versión fija de Tailwind + `.hidden` de respaldo, botón Apple) y luego la Fase 1 (resumen con total, límites y fuga de estado). Con eso la demo es segura y el flujo principal es correcto y comprensible.

**Qué puede quedarse como está:**
- `booking.service.js`, en su diseño transaccional con un solo blob de estado: es adecuado para la escala y fácil de sustituir por una API.
- `asyncList` (solo hay que ajustar el loader).
- La estructura de carpetas.
- Los scripts clásicos sin bundler (no hace falta introducir módulos ES ni un framework).
- Tailwind como herramienta de estilos.
- IndexedDB como persistencia local de la demo.
- Las pruebas existentes.

**Veredicto:** un proyecto académico **sólido en datos y concurrencia, mejorable en arquitectura de UI y deficiente en UX, responsive y accesibilidad**. Los arreglos necesarios son concretos, pequeños y compatibles con el stack actual.

---

### Anexo A — Capturas de pantalla
| Archivo | Qué muestra |
|---|---|
| `screenshots/1280-sin-internet-cdn.png` | B-03: sin CDN, todas las vistas y el modal apilados |
| `screenshots/1280-05-login.png` | B-11 (botón Apple vacío) + paleta morada ajena |
| `screenshots/320-06-checkout.png` | B-02 (sin total) + B-13 (fechas recortadas) + CTA con degradado |
| `screenshots/768-04-rooms.png` / `768-nav-2-filas-about.png` | B-21: navbar de 2 filas en tablet |
| `screenshots/375-08-modal.png` | B-22: modal pegado a los bordes |
| `screenshots/375-07-reservas.png` | B-15: "1 noches", código largo, fechas ISO |
| `screenshots/320-02-menu-abierto.png` | B-19: pills del menú móvil pegadas |
| `screenshots/740x360-home-landscape.png` | B-21: hero bajo el navbar en landscape |
| `screenshots/1280-focus-visible-debil.png` | 5.6: foco casi invisible |
| `screenshots/1280-login-atorado-tras-agotada.png` | B-12: usuario autenticado atorado en Login |
| `screenshots/375-cancel-cruzado-modal-abierto.png` | B-10: modal abierto tras un error de cancelación |
| `screenshots/1280-rooms-agotada.png` | Estado "Agotada" (bien resuelto) |
| `screenshots/{320,375,768,1280}-0N-*.png` | Recorrido completo por vista y ancho |

### Anexo B — Scripts de verificación (fuera del repo)
`/workspace/hotel-audit/tools/qa1.cjs` (responsive + recorrido), `qa2.cjs` (comportamiento: historial, foco, Enter, estado, modal, pestañas), `qa3.cjs` (red, fuentes, imágenes, LAN, `file://`, offline), `qa4.cjs` (XSS en contexto de atributo, landscape, race, sesión corrupta). Las pruebas del repo (`tests/service.cjs`, `tests/concurrency.cjs`) se ejecutaron sin modificar, con dependencias instaladas en `/workspace/hotel-audit/tools/node_modules`.

---

## Actualización: backend local (02-oct-2026)

### Objetivo y alcance

Se cambió el flujo de datos para tener responsabilidades separadas: `overlook-kit/` sigue siendo el frontend y `backend/` contiene el servidor y el dominio. El backend local ofrece una API HTTP JSON y persiste el inventario y las reservas en `backend/data/hotel.json`, que se genera al arrancar y está excluido de Git. No se implementaron autenticación real, pagos reales ni disponibilidad por intervalo de fechas.

### Componentes

| Componente | Responsabilidad |
|---|---|
| `backend/server.cjs` | Rutas HTTP `/api`, JSON de errores, límites de payload y alojamiento de archivos estáticos del frontend. Escucha en `127.0.0.1:8765` por defecto. |
| `backend/booking.cjs` | Dominio síncrono sin I/O: valida correo, fechas, límites, disponibilidad, total y cancelación. El servidor calcula la tarifa; no confía en un precio proporcionado por el cliente. |
| `backend/file-store.cjs` | Persistencia asíncrona con `node:fs/promises`. Encadena mutaciones en una cola por proceso y reemplaza el JSON usando escritura temporal más `rename`. |
| `overlook-kit/js/services/booking.service.js` | Adaptador asíncrono del frontend: `fetch` para las rutas de la API y `BroadcastChannel` para actualizar pestañas del mismo navegador tras una mutación. |
| `overlook-kit/js/main.js` | Comprueba disponibilidad del backend al iniciar y muestra un mensaje visible si la aplicación se abre sin el servidor HTTP. |

La separación asíncrona/síncrona es deliberada: HTTP y disco usan `async`/`await` y promesas para no bloquear esperando I/O; las funciones puras de reglas del dominio son síncronas, deterministas y breves. La cola mantiene el orden de las escrituras y evita dos reservas exitosas cuando solo queda una unidad; no pretende paralelizar mutaciones del mismo inventario.

### Contrato HTTP

- `GET /api/health`: `{ "status": "ok" }`.
- `GET /api/rooms`: catálogo con inventario actual.
- `GET /api/reservations?email=...`: reservas del correo indicado.
- `POST /api/reservations`: recibe `roomId`, `userEmail`, `checkin` y `checkout`; el servidor genera el ID y calcula noches, precio y total.
- `DELETE /api/reservations/:id`: recibe `userEmail` en JSON, elimina una sola reserva y regresa su unidad al inventario.
- Errores de dominio y solicitudes inválidas: status HTTP 4xx más `{ "error": "..." }`; fallas inesperadas se registran en la consola del backend y responden HTTP 500 sin filtrar la ruta local.

La interfaz se sirve desde el mismo origen que la API; no se configura CORS. Las rutas de reserva mantienen los límites existentes: hasta 30 noches, llegada a no más de 365 días, llegada no anterior a hoy y salida posterior a llegada. La cantidad es inventario global, no una asignación temporal por fechas.

### Concurrencia, persistencia y límites

Las solicitudes de reserva y cancelación se ejecutan en una cola dentro del proceso Node: cada operación carga el estado vigente, aplica de forma síncrona la mutación de dominio y guarda el nuevo estado antes de que comience la mutación siguiente. La escritura temporal y `rename` evitan dejar un JSON parcialmente escrito. Una segunda cancelación del mismo identificador falla sin alterar el inventario.

**Límite importante:** esta coordinación solo cubre una instancia del backend. No correr dos procesos Node contra el mismo archivo; no hay lock de archivo interproceso ni base de datos compartida. Para producción, concurrencia distribuida, autenticación o más de una instancia, sustituir el almacén por una base transaccional y obtener la identidad del usuario desde una sesión/token validado en el servidor. El archivo JSON guarda datos sin cifrar.

El host local predeterminado es loopback y solo admite uso en la misma computadora. Configurar `HOST=0.0.0.0` permite acceso desde la red local, pero no agrega autenticación; no exponer esta demo en redes no confiables.

### Ejecución y pruebas

Desde `overlook-kit/`, con Node.js 18 o posterior:

```bash
npm run serve
```

Abre <http://127.0.0.1:8765>. El servidor sirve tanto la UI como la API. Las pruebas de servicio usan un servidor HTTP real, directorio temporal y datos aislados; las pruebas Playwright inician su propio backend temporal.

La validación posterior al cambio se ejecutó con:

- `node tests/service.cjs`: **OK**; diez solicitudes concurrentes para dos unidades, cancelación duplicada, validaciones, respuesta HTTP, persistencia y respuesta asíncrona obsoleta.
- `npm run test:browser`: **OK**; varias pestañas y flujo completo de reserva contra la API real.
- `npm run test:qa`: **OK** tras adaptar el escenario de agotamiento para cancelar y devolver las reservas de preparación. Incluye UI, fechas, errores de backend, y compatibilidad explícita con `file://` como modo no soportado.

La app abierta con `file://` ya no puede reservar: requiere la API HTTP y muestra un aviso indicando cómo iniciar el backend. Ejecutar desde Node sirve también el frontend; no se debe levantar `python -m http.server` para esta configuración.
