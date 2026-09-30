> **OBSOLETO.** Esta guía describe el armado anterior (localStorage, doble clic, otra paleta). No la uses para ejecutar ni integrar el kit. La guía vigente es [LEEME.md](LEEME.md). Se conserva como antecedente académico.

# 🧱 Overlook Resort & Spa — Kit de armado

Este proyecto venía como **un solo archivo HTML**. Ahora es un **kit de piezas** que se arma paso a paso, como un set de Lego.

- **Piezas:** 21 archivos pequeños (20 JS + 1 CSS), cada uno con una sola responsabilidad.
- **Modelo terminado:** `index.html` (la "foto de la caja").
- **Placa base:** `index.base.html` (la página vacía donde empiezas).
- **Sin instalación:** se abre con doble clic. Solo necesita internet (Tailwind, Google Fonts e imágenes vienen de CDN).

> Cada pieza `.js` trae al inicio un encabezado con **Requiere** (qué piezas necesita antes) y **Expone** (qué aporta a las demás). Es el "número de pieza" de tu instructivo.

---

## 📦 Contenido de la caja

```
overlook-kit/
├── LEEME.md                  ← este manual
├── index.base.html           ← PLACA BASE (Paso 1)
├── index.html                ← MODELO ARMADO (referencia)
├── css/
│   └── styles.css            ← estilos que Tailwind no cubre
└── js/
    ├── config/
    │   └── tailwind.config.js        colores y fuentes de la marca
    ├── data/
    │   └── rooms.data.js             inventario inicial de habitaciones
    ├── core/                         EL NÚCLEO
    │   ├── registry.js               "tablero" donde se enchufan componentes y vistas
    │   ├── state.js                  variables compartidas (reserva en curso, etc.)
    │   ├── storage-init.js           prepara localStorage la primera vez
    │   └── router.js                 navigate(): cambia de vista y pinta el navbar
    ├── services/
    │   └── auth.service.js           login / logout simulado
    ├── components/                   PIEZAS DE HTML REUTILIZABLES
    │   ├── navbar.component.js
    │   └── cancel-modal.component.js
    ├── views/                        UNA PIEZA POR PANTALLA (solo HTML)
    │   ├── home.view.js
    │   ├── about.view.js
    │   ├── rooms.view.js
    │   ├── checkout.view.js
    │   ├── login.view.js
    │   └── reservations.view.js
    ├── features/                     LÓGICA DE CADA FUNCIONALIDAD
    │   ├── rooms-list.feature.js         pinta las habitaciones
    │   ├── checkout.feature.js           reserva con fechas + confirmar pago
    │   ├── reservations-list.feature.js  panel "Mis reservas"
    │   └── cancel-flow.feature.js        modal y lógica de cancelación
    └── main.js                   la pieza final que enciende todo
```

**Regla de oro:** las piezas se cargan en el orden de los pasos. Una pieza solo usa piezas de pasos anteriores (o funciones que se llaman más tarde, cuando el usuario hace clic).

---

## 🔧 Instrucciones de armado

Empieza copiando `index.base.html` a un archivo de trabajo (por ejemplo `index.mio.html`) y ve agregando lo que indica cada paso. Al terminar debe quedar igual a `index.html`.

### Paso 1 — Placa base
Abre `index.base.html`. Verás una página en blanco: es correcto. Ya trae tres "ranuras" vacías donde se montará todo:
`#navbar-root`, `#modal-root` y `#app-content`.

✅ **Comprobación:** abre la consola del navegador (F12). No debe haber errores.

### Paso 2 — Estilo (colores, fuentes)
Dentro del `<head>`, **después** del script de Tailwind, agrega:
```html
<script src="js/config/tailwind.config.js"></script>
<link rel="stylesheet" href="css/styles.css">
```
✅ **Comprobación:** en la consola escribe `tailwind.config.theme.extend.colors.overlook.pink`. Debe responder `"#FF99D6"`.

### Paso 3 — Núcleo y datos
Antes de `</body>`, agrega **en este orden**:
```html
<script src="js/core/registry.js"></script>
<script src="js/data/rooms.data.js"></script>
<script src="js/core/state.js"></script>
<script src="js/core/storage-init.js"></script>
```
✅ **Comprobación:** en la consola, `JSON.parse(localStorage.overlook_rooms).length` debe dar `3`.

### Paso 4 — Router
```html
<script src="js/core/router.js"></script>
```
✅ **Comprobación:** `typeof navigate` debe dar `"function"`.

### Paso 5 — Servicio de autenticación
```html
<script src="js/services/auth.service.js"></script>
```
✅ **Comprobación:** `typeof loginGenerico` debe dar `"function"`.

### Paso 6 — Componentes
```html
<script src="js/components/navbar.component.js"></script>
<script src="js/components/cancel-modal.component.js"></script>
```
✅ **Comprobación:** `Object.keys(Overlook.components)` debe dar `["navbar", "cancelModal"]`.

### Paso 7 — Vistas
```html
<script src="js/views/home.view.js"></script>
<script src="js/views/about.view.js"></script>
<script src="js/views/rooms.view.js"></script>
<script src="js/views/checkout.view.js"></script>
<script src="js/views/login.view.js"></script>
<script src="js/views/reservations.view.js"></script>
```
✅ **Comprobación:** `Object.keys(Overlook.views).length` debe dar `6`.

### Paso 8 — Funcionalidades
```html
<script src="js/features/rooms-list.feature.js"></script>
<script src="js/features/checkout.feature.js"></script>
<script src="js/features/reservations-list.feature.js"></script>
<script src="js/features/cancel-flow.feature.js"></script>
```
✅ **Comprobación:** `typeof renderRooms`, `typeof startCheckout` y `typeof openCancelModal` deben dar `"function"`.

### Paso 9 — Arranque 🎉
```html
<script src="js/main.js"></script>
```
Esta pieza monta el HTML en las ranuras, conecta los eventos y abre la pantalla de inicio.

✅ **Comprobación final (recorrido completo):**
1. Se ve la portada de Overlook.
2. **Habitaciones** muestra 3 tarjetas con su disponibilidad.
3. **Reservar** te manda a iniciar sesión → elige Google/Apple/Facebook → llegas al checkout.
4. **Confirmar y Pagar** te lleva a **Mis Reservaciones** y baja la disponibilidad en 1.
5. **Cancelar** abre el modal y, al confirmar, devuelve la habitación al inventario.

---

## 🧩 ¿Cómo agrego piezas nuevas?

**Una pantalla nueva** (ej. "Contacto")
1. Crea `js/views/contact.view.js` con `Overlook.views.contact = \`<section id="view-contact" class="hidden ...">...</section>\`;` (copia el formato de otra vista).
2. Agrégala al `<script>` del Paso 7 en `index.html`.
3. Agrega `'contact'` a `VIEW_ORDER` en `js/main.js`.
4. Navega a ella con `navigate('contact')`.

**Una habitación nueva:** agrega un objeto en `js/data/rooms.data.js`.
⚠️ Como los datos viven en `localStorage`, para ver el cambio ejecuta `localStorage.clear()` en la consola y recarga.

**Cambiar colores o fuentes:** solo `js/config/tailwind.config.js`.

---

## 📐 Contratos entre piezas

| Qué | Dónde vive | Detalle |
|---|---|---|
| Habitaciones | `localStorage.overlook_rooms` | Lista con `qty` (disponibles) |
| Reservas | `localStorage.overlook_reservations` | Lista con `userEmail`, fechas, precio |
| Sesión | `localStorage.overlook_user` | `{ email, nombre }` |
| Funciones globales | `window.*` | El HTML usa `onclick="navigate(...)"`, por eso siguen siendo globales |
| Reserva en curso | `currentRoomToBook` (state.js) | La usan checkout y login |

---

## 📝 Notas para el equipo

Los archivos se dividieron **sin cambiar la lógica**: el HTML resultante es idéntico al original. Estas observaciones del proyecto original quedan pendientes por si quieren mejorarlas:

- El campo de e-mail de la pantalla de login **no se lee**: "CONTINUAR" entra siempre como `invitado@overlook.com`.
- Los campos de tarjeta del checkout son solo visuales (no se validan ni se guardan).
- En "Mis Reservaciones", el texto dice `Total: $X / Noche`, pero es el precio por noche, no el total de la estancia.
- Al reservar no se verifica si esas fechas ya estaban ocupadas: solo se descuenta 1 del inventario.
- Los datos viven en `localStorage`, así que cada navegador tiene su propio inventario.
