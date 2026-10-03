const fs = require('node:fs');
const fsPromises = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const { pipeline } = require('node:stream/promises');
const { BookingError, cancelBooking, createBooking, validEmail } = require('./booking.cjs');
const { createFileStore } = require('./file-store.cjs');

const MAX_BODY_BYTES = 16 * 1024;
const MIME_TYPES = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp'
};

function sendJson(response, statusCode, value) {
    response.writeHead(statusCode, {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json; charset=utf-8',
        'X-Content-Type-Options': 'nosniff'
    });
    response.end(JSON.stringify(value));
}

async function readJsonBody(request) {
    const chunks = [];
    let size = 0;
    for await (const chunk of request) {
        size += chunk.length;
        if (size > MAX_BODY_BYTES) throw new BookingError('El cuerpo de la solicitud es demasiado grande.', 413);
        chunks.push(chunk);
    }
    if (!size) throw new BookingError('Faltan los datos de la solicitud.');
    try {
        return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
        throw new BookingError('El cuerpo de la solicitud debe ser JSON válido.');
    }
}

async function serveStatic(request, response, frontendRoot, pathname) {
    let decodedPath;
    try {
        decodedPath = decodeURIComponent(pathname);
    } catch {
        throw new BookingError('La ruta solicitada no es válida.', 400);
    }

    const root = path.resolve(frontendRoot);
    const requestedPath = decodedPath === '/' ? '/index.html' : decodedPath;
    const filePath = path.resolve(root, `.${requestedPath}`);
    if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
        throw new BookingError('No se encontró el recurso solicitado.', 404);
    }

    let stat;
    try {
        stat = await fsPromises.stat(filePath);
    } catch (error) {
        if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
            throw new BookingError('No se encontró el recurso solicitado.', 404);
        }
        throw error;
    }
    if (!stat.isFile()) throw new BookingError('No se encontró el recurso solicitado.', 404);

    response.writeHead(200, {
        'Cache-Control': 'no-cache',
        'Content-Length': stat.size,
        'Content-Type': MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
        'X-Content-Type-Options': 'nosniff'
    });
    if (request.method === 'HEAD') return response.end();
    await pipeline(fs.createReadStream(filePath), response);
}

async function createServer(options = {}) {
    const frontendRoot = options.frontendRoot || path.resolve(__dirname, '..', 'overlook-kit');
    const dataFile = options.dataFile || path.join(__dirname, 'data', 'hotel.json');
    const store = createFileStore(dataFile);
    await store.initialize();

    const server = http.createServer(async (request, response) => {
        try {
            const url = new URL(request.url, 'http://localhost');
            const pathname = url.pathname;

            if (pathname.startsWith('/api/')) {
                if (request.method === 'GET' && pathname === '/api/health') {
                    return sendJson(response, 200, { status: 'ok' });
                }
                if (request.method === 'GET' && pathname === '/api/rooms') {
                    const state = await store.read();
                    return sendJson(response, 200, state.rooms);
                }
                if (request.method === 'GET' && pathname === '/api/reservations') {
                    const email = validEmail(url.searchParams.get('email'));
                    if (!email) throw new BookingError('Indica un correo válido.');
                    const state = await store.read();
                    return sendJson(response, 200, state.reservations.filter(item => item.userEmail === email));
                }
                if (request.method === 'POST' && pathname === '/api/reservations') {
                    const input = await readJsonBody(request);
                    const reservation = await store.update(state => createBooking(state, input));
                    return sendJson(response, 201, reservation);
                }
                const match = pathname.match(/^\/api\/reservations\/([^/]+)$/);
                if (request.method === 'DELETE' && match) {
                    let id;
                    try {
                        id = decodeURIComponent(match[1]);
                    } catch {
                        throw new BookingError('El identificador de reserva no es válido.');
                    }
                    const body = await readJsonBody(request);
                    await store.update(state => cancelBooking(state, id, body.userEmail));
                    return sendJson(response, 200, { cancelled: true });
                }
                throw new BookingError('La ruta de API no existe.', 404);
            }

            if (request.method !== 'GET' && request.method !== 'HEAD') {
                throw new BookingError('Método no permitido.', 405);
            }
            await serveStatic(request, response, frontendRoot, pathname);
        } catch (error) {
            if (response.headersSent) {
                console.error('Error enviando la respuesta HTTP:', error);
                response.destroy(error);
                return;
            }
            if (error instanceof BookingError) {
                return sendJson(response, error.statusCode, { error: error.message });
            }
            console.error('Error procesando la solicitud HTTP:', error);
            return sendJson(response, 500, { error: 'Ocurrió un error interno al procesar la solicitud.' });
        }
    });

    return server;
}

if (require.main === module) {
    const port = Number(process.env.PORT || 8765);
    const host = process.env.HOST || '127.0.0.1';
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        console.error('PORT debe ser un número entre 1 y 65535.');
        process.exitCode = 1;
    } else {
        createServer()
            .then(server => server.listen(port, host, () => {
                console.log(`Overlook listo en http://${host}:${port}`);
                console.log('La API y la interfaz están disponibles en el mismo origen.');
            }))
            .catch(error => {
                console.error('No se pudo iniciar Overlook:', error);
                process.exitCode = 1;
            });
    }
}

module.exports = { createServer };
