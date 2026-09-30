# Overlook Resort & Spa

Sitio estático de un hotel boutique. Es una demostración: no hay backend, el acceso no es real y el pago no cobra nada. La persistencia de inventario y reservas está en IndexedDB, en el navegador de quien lo abre.

## Ejecutar

Hace falta un servidor HTTP. `file://` puede abrir la página en Chrome, pero el uso previsto es localhost o la red local.

```bash
cd overlook-kit
python3 -m http.server 8765
```

Abre http://localhost:8765 . La ruta queda en el hash: `#/home`, `#/about`, `#/rooms`, `#/checkout`, `#/login`, `#/reservations`. Recargar conserva la vista. Atrás y adelante recorren ese historial.

En un celular de la misma red se puede usar `http://<IP-de-la-computadora>:8765`. Reservar funciona también por HTTP sin `localhost`: el identificador no depende de `crypto.randomUUID`.

Tailwind llega por CDN (versión fijada). Si el CDN no carga, `css/styles.css` mantiene el mostrar/ocultar de vistas, el modal y la maquetación esencial. Las fotos de habitación están en `img/`.

## Qué hace cada pantalla

- **Inicio.** Presentación y accesos a habitaciones y a la historia del hotel.
- **Nosotros.** Tres ideas del hotel.
- **Habitaciones.** Inventario global. «Unidades en inventario» no es la disponibilidad de unas fechas concretas.
- **Login.** Correo con validación, o un acceso social marcado como demo. Esas cuentas son compartidas y ficticias.
- **Checkout.** Resumen con habitación, fechas, noches, precio por noche y total. El total se recalcula al cambiar las fechas. La tarjeta es una simulación: no se guarda ni se envía. El aviso visible dice: «Demo: no ingreses datos reales de tarjeta.»
- **Mis reservas.** Código corto, código completo, fechas en español de México, precio y total. Se puede cancelar.

Mis reservas exige sesión. Checkout sin una habitación elegida vuelve a habitaciones. Si la habitación se agota mientras alguien inicia sesión, la sesión queda abierta y se regresa a habitaciones.

## Reglas de reserva

Constantes en `js/core/dates.js`:

- estancia máxima: **30 noches**
- anticipación máxima de la llegada: **365 días**
- la salida tiene que ser posterior a la llegada
- la llegada no puede ser anterior a hoy

El inventario baja en la misma transacción IndexedDB que crea la reserva. Dos pestañas no pueden vender la última unidad dos veces. Cancelar devuelve una unidad. Una segunda cancelación de la misma reserva no vuelve a sumar.

La base se llama `overlook-async-v1`. Para vaciarla: herramientas del navegador → Application → IndexedDB → borrar `overlook-async-v1` y recargar. Editar `rooms.data.js` no cambia un inventario que ya se creó.

La sesión de demostración está en `localStorage.overlook_user` (`email` y `nombre`). No es autenticación de servidor. Cualquiera con acceso al navegador puede modificarla.

## Archivos que no son la app

- `index.html` es la aplicación.
- `index.base.html` es la placa vacía del ejercicio académico. No se usa al ejecutar el sitio.
- `LEEME-original.md` es el instructivo anterior (localStorage). Está obsoleto; no sigas esos pasos.

## Integrar el servicio

Cargar, en este orden, `registry.js`, `id.js`, `dates.js`, `html.js`, `rooms.data.js`, `booking.service.js`, las tarjetas y `async-list.component.js`.

```js
const service = Overlook.services.booking;
const catalogo = Overlook.components.asyncList.mount(document.querySelector('#catalogo'), {
  load: () => service.listRooms(),
  render: room => Overlook.components.roomCard(room)
});
await catalogo.refresh();
```

Las tarjetas escapan los datos. No hace falta envolver el registro en `safeRecord` antes de pasarlas; `safeRecord` sigue disponible para plantillas propias. Las acciones usan `data-action` y `data-room-id` / `data-reservation-id`, no `onclick` con el id interpolado.

```js
await service.ready;
const reservation = await service.book({
  roomId: 1,
  userEmail: 'demo@example.com',
  checkin: '2026-12-01',
  checkout: '2026-12-03'
});
await service.cancel(reservation.id, 'demo@example.com');
```

Esas fechas de ejemplo tienen que caer dentro del horizonte de 365 días respecto al día en que se ejecutan. Si se sustituye el servicio por una API, la identidad debe salir del servidor y la transacción de inventario también.

## Pruebas

Con Node.js, dentro de `overlook-kit`:

```bash
npm install
node tests/service.cjs
```

Esa prueba no abre navegador. Cubre concurrencia sobre IndexedDB, noches, total, titularidad, límites de estancia y el generador de ids.

La prueba de dos pestañas y el recorrido de interfaz usan Playwright y Chromium o Chrome:

```bash
python3 -m http.server 8765
# en otra terminal
CHROMIUM_PATH=/usr/bin/google-chrome OVERLOOK_URL=http://127.0.0.1:8765 node tests/concurrency.cjs
CHROMIUM_PATH=/usr/bin/google-chrome OVERLOOK_URL=http://127.0.0.1:8765 node tests/qa.cjs
```

`tests/qa.cjs` recorre reserva, agotado, simultáneas, cancelación, login, fechas, hash, modal, anchos, el regreso de la pestaña, el CDN bloqueado y datos con pinta de script.

## Límites que siguen siendo de la demo

- No hay cuenta real, ni correo, ni pago, ni inventario por fecha.
- Las redes del login entran como invitados compartidos y están marcadas como demo.
- Otra computadora no comparte el IndexedDB de esta.
- Tailwind y las fuentes siguen pidiendo red; sin Tailwind el respaldo es `styles.css`, no una copia de todas las utilidades.
