# Overlook — kit de componentes asíncronos

## Qué entregar al otro equipo

Esta carpeta contiene el kit de los compañeros ampliado. Conserva el diseño,
las seis vistas y los archivos de navegación. `index.html` es el ejemplo armado;
`index.base.html` es una placa vacía. La guía previa queda en
`LEEME-original.md` únicamente como antecedente: utiliza esta guía para el kit actualizado.

## Ejecutar

1. Descomprimir la carpeta completa.
2. Abrir una terminal dentro de `overlook-kit`.
3. Ejecutar `python -m http.server 8000` (en Windows también sirve `py -m http.server 8000`).
4. Abrir http://localhost:8000 en el navegador. También sirve Live Server de VS Code.

No se necesita React ni una compilación. Mantener el orden de scripts de
`index.html`. Tailwind, fuentes e imágenes requieren Internet. Las reservas y
el login son una demostración local; no hay pagos ni autenticación real.
Los números de tarjeta no se guardan. Usar datos ficticios.

## Catálogo y contratos

| Archivo | Responsabilidad | Entrada / salida |
| --- | --- | --- |
| components/navbar.component.js | Barra de navegación | `Overlook.components.navbar`, HTML |
| components/cancel-modal.component.js | Confirmación de cancelación | `Overlook.components.cancelModal`, HTML |
| components/roomCard.component.js | Tarjeta de habitación reutilizable | `roomCard(room)` → HTML |
| components/reservationCard.component.js | Tarjeta de reserva reutilizable | `reservationCard(reservation)` → HTML |
| components/async-list.component.js | Lista asíncrona independiente | `mount(element, {load, render, empty})` → `{refresh, destroy}` |
| services/booking.service.js | Persistencia y control de concurrencia | Métodos que devuelven Promesas |
| services/auth.service.js | Sesión de demostración y botones de acceso | `loginGenerico(provider)`, `logout()` |
| views/*.view.js | Inicio, información, habitaciones, pago, login y reservas | HTML registrado en `Overlook.views` |
| features/*.feature.js | Integración entre componentes y servicios | `renderRooms`, `renderReservations`, flujos de reserva y cancelación |
| core/router.js | Navegación asíncrona | `await navigate(viewId)` |
| main.js | Composición de la aplicación | Monta vistas, enlaza eventos y carga listas |

Las plantillas estáticas se montan de inmediato; la asincronía está en las listas
y en las operaciones de datos. Las tarjetas conservan sus acciones del kit:
`startCheckout(roomId)` y `openCancelModal(reservationId)`; para usarlas fuera de
la aplicación, el equipo debe enlazar esas funciones o sustituir esos manejadores.
No montar dos copias de una vista con los mismos IDs. El componente `asyncList`
sí admite múltiples contenedores independientes.

## Integrar dos componentes concurrentes en otra página

Cargar `registry.js`, `rooms.data.js`, `booking.service.js`, los dos archivos de
tarjetas y `async-list.component.js`, en ese orden. Crear los contenedores:

```html
<div id="catalogo"></div>
<div id="reservas"></div>
```

```js
const service = Overlook.services.booking;
const catalogo = Overlook.components.asyncList.mount(
  document.querySelector('#catalogo'), {
    load: () => service.listRooms(),
    render: room => Overlook.components.roomCard(Overlook.safeRecord(room))
  }
);
const reservas = Overlook.components.asyncList.mount(
  document.querySelector('#reservas'), {
    load: () => service.listReservations('demo@example.com'),
    render: res => Overlook.components.reservationCard(Overlook.safeRecord(res)),
    empty: 'No hay reservas.'
  }
);
await Promise.allSettled([catalogo.refresh(), reservas.refresh()]);
// Al retirar los componentes:
// catalogo.destroy(); reservas.destroy();
```

`load` debe devolver una Promesa con un arreglo. `render` devuelve HTML y debe
escapar datos externos; `safeRecord` hace ese escape para los registros planos
usados aquí. Sólo usar URLs de imágenes confiables. `refresh()` puede volver a
invocarse; una respuesta anterior nunca reemplaza a la más reciente. `destroy()`
impide que una carga pendiente vuelva a escribir en un componente retirado.
Los errores se muestran como texto dentro de cada lista; su `refresh()` los
maneja internamente.

## Servicio asíncrono

```js
await service.ready;
const rooms = await service.listRooms();
const reservations = await service.listReservations('demo@example.com');
const reservation = await service.book({
  roomId: 1, userEmail: 'demo@example.com',
  checkin: '2030-10-01', checkout: '2030-10-03'
});
await service.cancel(reservation.id, 'demo@example.com');
```

Para reservar se valida usuario, fecha de llegada, salida posterior y
existencias. La reserva incluye `nights` y `total` en MXN. La cantidad es un
inventario global simplificado, como en el HTML original: no calcula solapamiento
de fechas ni libera automáticamente reservas al terminar la estancia.

## Dónde está la concurrencia

- `main.js`: `Promise.allSettled` inicia la carga de habitaciones y reservas sin
  esperar primero a que termine la otra. Cada lista tiene su estado de carga.
- `async-list.component.js`: cada instancia lleva un contador de solicitudes
  que evita resultados obsoletos cuando se refresca rápidamente.
- `booking.service.js`: IndexedDB usa una única transacción `readwrite` para
  leer disponibilidad, descontar inventario y guardar la reserva. Sus
  transacciones de escritura sobre el mismo almacén se serializan entre pestañas
  del mismo origen. Si sólo queda una habitación, sólo una reserva tiene éxito.
- Los formularios bloquean envíos repetidos durante una operación. Una segunda
  cancelación falla sin volver a incrementar inventario.
- Los cambios locales refrescan ambas listas; otra pestaña se actualiza al
  recuperar foco. Siempre se vuelve a validar al guardar, aunque su lista
  visible esté desactualizada.

La concurrencia consiste en operaciones pendientes que progresan de manera
independiente; no requiere varios hilos de JavaScript. IndexedDB tiene una API
asíncrona real: no se añadió un temporizador para simularla.

## Conectar a una API del otro equipo

Sustituir `Overlook.services.booking` por un objeto con los mismos métodos y
respuestas. `ready` puede ser `Promise.resolve()`. Usar `fetch` dentro de los
métodos, comprobar `response.ok` y lanzar errores con mensajes apropiados.
La API debe autenticar al usuario y obtener su identidad en el servidor;
no confiar en un correo enviado por el navegador. La base de datos del servidor
debe guardar reserva e inventario en una transacción y comprobar disponibilidad.
La protección de IndexedDB cubre pestañas del mismo navegador y origen, no
reservas desde computadoras distintas. Login social y pago requieren sus
integraciones reales.

## Datos y compatibilidad

Esta versión usa la base `overlook-async-v1` de IndexedDB y empieza con el
inventario de `rooms.data.js`. No migra las reservas antiguas de localStorage.
La sesión de demostración permanece en `overlook_user`. Para reiniciar los datos,
eliminar `overlook-async-v1` en las herramientas del navegador, sección
Application/Storage → IndexedDB, y recargar. El navegador debe permitir IndexedDB.

## Comprobación automatizada

El archivo `tests/concurrency.cjs` prueba solicitudes simultáneas entre dos
pestañas, agotamiento de existencias, cancelación doble, respuesta fuera de orden
y el flujo de login manual y reserva. Usa un contexto nuevo y no modifica las
reservas de tu navegador personal.

Con Node.js instalado:

```bash
npm install --no-save playwright
npx playwright install chromium
python -m http.server 8765
# En otra terminal, dentro de la misma carpeta:
node tests/concurrency.cjs
```

### Validación realizada en esta entrega

Pasó la revisión de sintaxis de todos los archivos JS. Se ejecutó
`tests/service.cjs` con fake-indexeddb: 10 solicitudes desde dos conexiones,
reservas limitadas a existencias, cancelaciones simultáneas, fechas inválidas,
titularidad, cálculo del total, respuestas obsoletas y desmontaje.
La prueba de navegador `tests/concurrency.cjs` está incluida, pero no se pudo
completar aquí porque la descarga de Chromium falló. Falta verificar visualmente
la aplicación y ejecutar esa prueba en el equipo receptor.

Para repetir las pruebas del servicio sin navegador:

```bash
npm install --no-save fake-indexeddb
node tests/service.cjs
```
