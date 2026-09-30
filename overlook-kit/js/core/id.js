/* Identificadores que no dependen de un contexto seguro (HTTPS/localhost). */
Overlook.createId = function createId() {
    try {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            const id = crypto.randomUUID();
            if (id) return id;
        }
    } catch (error) { /* HTTP por IP de red: randomUUID no existe o lanza. */ }
    try {
        if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
            const bytes = new Uint8Array(16);
            crypto.getRandomValues(bytes);
            bytes[6] = (bytes[6] & 0x0f) | 0x40;
            bytes[8] = (bytes[8] & 0x3f) | 0x80;
            const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
            return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) + '-' + hex.slice(16, 20) + '-' + hex.slice(20);
        }
    } catch (error) { /* Último recurso debajo. */ }
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
};
