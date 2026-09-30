/* Fechas locales, límites de estancia y formato es-MX. Los hex de dinero no viven aquí. */
Overlook.dates = (() => {
    const MAX_NIGHTS = 30;
    const MAX_ADVANCE_DAYS = 365;
    const MS_PER_DAY = 24 * 60 * 60 * 1000;

    function parse(value) {
        if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
        const [year, month, day] = value.split('-').map(Number);
        const date = new Date(year, month - 1, day, 12, 0, 0, 0);
        if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
        return date;
    }

    function toISO(date) {
        if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return date.getFullYear() + '-' + month + '-' + day;
    }

    function today() {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
    }

    function addDays(date, days) {
        const next = new Date(date.getTime());
        next.setDate(next.getDate() + days);
        next.setHours(12, 0, 0, 0);
        return next;
    }

    function nightsBetween(checkin, checkout) {
        const start = typeof checkin === 'string' ? parse(checkin) : checkin;
        const end = typeof checkout === 'string' ? parse(checkout) : checkout;
        if (!start || !end) return null;
        return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY);
    }

    function formatDate(value) {
        const date = typeof value === 'string' ? parse(value) : value;
        if (!date) return '';
        return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
    }

    function formatMoney(amount) {
        const number = Number(amount);
        if (!Number.isFinite(number)) return '';
        const formatted = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(number);
        return '$' + formatted + ' MXN';
    }

    function nightsLabel(nights) {
        const count = Number(nights);
        if (!Number.isFinite(count) || count < 1) return '';
        return count === 1 ? '1 noche' : count + ' noches';
    }

    return {
        MAX_NIGHTS, MAX_ADVANCE_DAYS, MS_PER_DAY,
        parse, toISO, today, addDays, nightsBetween, formatDate, formatMoney, nightsLabel
    };
})();
