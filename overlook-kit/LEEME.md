# Overlook Resort & Spa

Aplicación local de demostración para reservas de hotel. El proyecto separa la **interfaz** en `overlook-kit/` y el **backend HTTP** en `backend/`. Node.js sirve ambos bajo el mismo origen; las reservas ya no se guardan en el navegador.

El acceso y el pago siguen siendo simulados. No ingresar datos reales de tarjeta.

## Ejecutar en local

Requisito: Node.js 18 o posterior. Desde la carpeta `overlook-kit/`:

```bash
cd tu ruta donde tengas el archivo
npm run serve
```

Abre <http://127.0.0.1:8765>. Este único proceso sirve la SPA y su API local. No ejecutes un servidor estático aparte. Para cambiar el puerto, define `PORT`; por seguridad, el host predeterminado es `127.0.0.1` y se puede cambiar con `HOST`.

Las rutas de la SPA viven en el hash: `#/home`, `#/about`, `#/rooms`, `#/checkout`, `#/login` y `#/reservations`. Tailwind y las fuentes externas siguen cargándose desde CDN.

## Estructura y responsabilidades

```text
backend/
├── server.cjs       HTTP, API JSON y archivos estáticos del frontend
├── booking.cjs      reglas síncronas y operaciones del dominio
├── file-store.cjs   lectura/escritura asíncrona y cola de mutaciones
└── data/            hotel.json generado localmente (ignorado por Git)

overlook-kit/
├── index.html       punto de entrada del frontend
├── js/views/        vistas
├── js/components/   componentes de interfaz
├── js/features/     flujos e interacción de UI
├── js/services/     adaptador HTTP del frontend
└── tests/           pruebas de servicio y navegador
```

- **Frontend:** `js/services/booking.service.js` hace solicitudes asíncronas a `/api`; no conoce el formato del archivo de persistencia. Tras una reserva o cancelación, la UI se actualiza y las otras pestañas del mismo navegador reciben el cambio por `BroadcastChannel`.
- **Backend:** `backend/server.cjs` valida las rutas, lee JSON, devuelve errores HTTP y sirve los archivos de `overlook-kit/`.
- **Dominio:** `backend/booking.cjs` contiene funciones síncronas, sin acceso a red ni disco, para validar correo/fechas, reservar y cancelar. El backend calcula el precio desde el inventario; no acepta precio enviado por el navegador.
- **Persistencia:** `backend/file-store.cjs` usa operaciones asíncronas de `node:fs/promises`. Una cola encadena todas las escrituras del proceso; cada cambio lee el estado actual, aplica la operación y reemplaza el JSON mediante un archivo temporal y `rename`. Así, dos solicitudes simultáneas no pueden consumir la misma última unidad. Las lecturas esperan a las escrituras anteriores.

La cola coordina **un único proceso Node.js**. No iniciar varias instancias apuntando al mismo `hotel.json`; para despliegue multi-proceso o multi-equipo se debe sustituir el almacén por una base transaccional compartida. El JSON local no cifra los datos.

## API local

| Método | Ruta | Uso |
|---|---|---|
| `GET` | `/api/health` | Estado del backend |
| `GET` | `/api/rooms` | Inventario de habitaciones |
| `GET` | `/api/reservations?email=...` | Reservas asociadas al correo |
| `POST` | `/api/reservations` | Crear una reserva |
| `DELETE` | `/api/reservations/:id` | Cancelar una reserva |

Ejemplo de creación: `POST /api/reservations` con JSON `{ "roomId": 1, "userEmail": "demo@example.com", "checkin": "2026-12-01", "checkout": "2026-12-03" }`. La respuesta contiene el identificador, tarifa, noches y total calculados por el servidor. Los errores usan un estado HTTP 4xx/5xx y JSON `{ "error": "mensaje" }`.

## Reglas de reserva

Se validan tanto en el cliente para dar respuesta inmediata como en el backend para proteger los datos:

- estancia máxima: **30 noches**;
- llegada con hasta **365 días** de anticipación y no anterior a hoy;
- salida posterior a la llegada;
- disponibilidad global positiva al confirmar.

El inventario es global; **no** se calcula disponibilidad por solapamiento de fechas. Reservar decrementa `qty` y crea la reserva en una única mutación serializada. Cancelar elimina la reserva y devuelve una unidad en la misma mutación. Una segunda cancelación falla y no aumenta el inventario otra vez.

Los datos se guardan en `backend/data/hotel.json`, creado al primer inicio. Para restablecer la demo: detén el backend y elimina **ese archivo concreto**; al arrancar se vuelve a sembrar el inventario inicial. No se guarda información de tarjeta.

## Ejecutar las pruebas

Desde `overlook-kit/`:

```bash
npm test
npm install
npm run test:browser
npm run test:qa
```

`npm test` prueba el servicio HTTP real, escrituras concurrentes, sobreventa, cancelación, validación y persistencia. Las pruebas Playwright inician su propio backend en un puerto temporal y usan un archivo de datos desechable; no hace falta arrancar `npm run serve` en otra terminal. Playwright requiere Chromium/Chrome; si no detecta el navegador instalado automáticamente, define `CHROMIUM_PATH` con su ruta.

## Seguridad y límites de la demo

- El login solo guarda una sesión ficticia en `localStorage`; el backend no autentica ni verifica que el correo de la solicitud pertenezca a la persona que la envía. **No exponer este servicio a Internet ni a una red no confiable.**
- El pago no procesa ni transmite la tarjeta. La cuenta, los correos, el inventario por fechas y los cobros reales requieren servicios y controles adicionales.
- El servidor solo escucha en loopback de forma predeterminada. Configurar `HOST=0.0.0.0` permite acceso desde la red local, pero no agrega autenticación.
- El JSON persistente es adecuado para desarrollo local de un solo proceso; no reemplaza una base de datos para producción.

## Archivos de referencia

- `index.html` es la aplicación; `index.base.html` es la placa vacía del ejercicio y no se usa en ejecución.
- `LEEME-original.md` describe una versión anterior basada en `localStorage`; está obsoleto.
- `../AUDITORIA_TECNICA.md` conserva el informe de auditoría original y añade una actualización de esta arquitectura.
