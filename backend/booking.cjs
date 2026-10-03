const { randomUUID } = require('node:crypto');

const MAX_NIGHTS = 30;
const MAX_ADVANCE_DAYS = 365;

const initialRooms = [
    { id: 1, name: 'De Luxe Room', pax: '2 adultos · 1 niño menor de 7 años', priceNum: 1890, img: 'img/room-deluxe.jpg', qty: 5 },
    { id: 2, name: 'De Luxe Sea View', pax: '2 adultos · 1 niño menor de 7 años', priceNum: 2090, img: 'img/room-sea.jpg', qty: 3 },
    { id: 3, name: 'The Alon Family Suite', pax: '4 adultos · 2 niños menores de 7 años', priceNum: 3990, img: 'img/room-family.jpg', qty: 2 }
];

class BookingError extends Error {
    constructor(message, statusCode = 400) {
        super(message);
        this.name = 'BookingError';
        this.statusCode = statusCode;
    }
}

function validEmail(value) {
    if (typeof value !== 'string') return null;
    const email = value.trim().toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function parseDay(value, field) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new BookingError(`Revisa la fecha de ${field}.`);
    }
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(0);
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCFullYear(year, month - 1, day);
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
        throw new BookingError(`Revisa la fecha de ${field}.`);
    }
    return date.getTime();
}

function localToday() {
    const now = new Date();
    return parseDay(
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
        'llegada'
    );
}

function validateBooking(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        throw new BookingError('Los datos de la reserva no son válidos.');
    }
    const email = validEmail(input.userEmail);
    if (!email) throw new BookingError('Inicia sesión para reservar.');

    const start = parseDay(input.checkin, 'llegada');
    const end = parseDay(input.checkout, 'salida');
    const today = localToday();
    if (start < today) throw new BookingError('La llegada no puede ser anterior a hoy.');

    const nights = (end - start) / 86400000;
    if (!Number.isInteger(nights) || nights < 1) {
        throw new BookingError('La salida debe ser posterior a la llegada.');
    }
    if (nights > MAX_NIGHTS) {
        throw new BookingError(`La estancia máxima es de ${MAX_NIGHTS} noches.`);
    }
    if (start > today + MAX_ADVANCE_DAYS * 86400000) {
        throw new BookingError(`Solo puedes reservar con hasta ${MAX_ADVANCE_DAYS} días de anticipación.`);
    }
    const roomId = typeof input.roomId === 'number' && Number.isInteger(input.roomId)
        ? input.roomId
        : typeof input.roomId === 'string' && /^\d+$/.test(input.roomId.trim())
            ? Number(input.roomId.trim())
            : NaN;
    if (!Number.isSafeInteger(roomId) || roomId < 1) throw new BookingError('Selecciona una habitación válida.');

    return {
        roomId,
        userEmail: email,
        checkin: input.checkin,
        checkout: input.checkout,
        nights
    };
}

function createBooking(state, input) {
    const booking = validateBooking(input);
    const room = state.rooms.find(item => item.id === booking.roomId);
    if (!room || room.qty <= 0) throw new BookingError('Esta habitación ya no tiene disponibilidad.', 409);

    const reservation = {
        id: `RES-${randomUUID()}`,
        userEmail: booking.userEmail,
        roomId: room.id,
        roomName: room.name,
        checkin: booking.checkin,
        checkout: booking.checkout,
        price: room.priceNum,
        nights: booking.nights,
        total: room.priceNum * booking.nights
    };
    room.qty--;
    state.reservations.push(reservation);
    return reservation;
}

function cancelBooking(state, id, emailInput) {
    const email = validEmail(emailInput);
    if (!email) throw new BookingError('Inicia sesión para cancelar.');
    const index = state.reservations.findIndex(item => item.id === id && item.userEmail === email);
    if (index < 0) throw new BookingError('La reserva ya fue cancelada o no pertenece a esta sesión.', 404);

    const reservation = state.reservations[index];
    const room = state.rooms.find(item => item.id === reservation.roomId);
    if (!room) throw new Error(`No existe la habitación ${reservation.roomId} asociada a la reserva.`);
    room.qty++;
    state.reservations.splice(index, 1);
}

function createInitialState() {
    return { rooms: structuredClone(initialRooms), reservations: [] };
}

function validateState(state) {
    if (!state || !Array.isArray(state.rooms) || !Array.isArray(state.reservations)) {
        throw new Error('El archivo local de datos no tiene un formato válido.');
    }
    const ids = new Set();
    for (const room of state.rooms) {
        if (!room || !Number.isSafeInteger(room.id) || ids.has(room.id) ||
            typeof room.name !== 'string' || !Number.isFinite(room.priceNum) ||
            !Number.isSafeInteger(room.qty) || room.qty < 0) {
            throw new Error('El inventario del archivo local de datos no es válido.');
        }
        ids.add(room.id);
    }
    for (const reservation of state.reservations) {
        if (!reservation || typeof reservation.id !== 'string' || !ids.has(reservation.roomId) ||
            !validEmail(reservation.userEmail)) {
            throw new Error('Una reserva del archivo local de datos no es válida.');
        }
    }
    return state;
}

module.exports = {
    BookingError,
    MAX_ADVANCE_DAYS,
    MAX_NIGHTS,
    cancelBooking,
    createBooking,
    createInitialState,
    initialRooms,
    validEmail,
    validateState
};
