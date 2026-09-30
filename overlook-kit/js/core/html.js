Overlook.escape = function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
};

Overlook.safeRecord = function safeRecord(record) {
    if (!record || typeof record !== 'object') return {};
    return Object.fromEntries(Object.entries(record).map(([key, value]) => [
        key,
        typeof value === 'string' ? Overlook.escape(value) : value
    ]));
};

Overlook.userMessage = function userMessage(error, fallback) {
    console.error(error);
    const message = error && typeof error.message === 'string' ? error.message : '';
    if (!message || /is not a function|unexpected token|undefined|indexeddb|syntaxerror|constraint|failed to execute|notallowed/i.test(message)) {
        return fallback;
    }
    return message;
};
