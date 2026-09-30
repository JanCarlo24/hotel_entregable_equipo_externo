/* Componente independiente por contenedor. mount devuelve refresh/destroy.
   Cada instancia tiene su propio contador: una respuesta antigua no sobrescribe
   una nueva. Promise.allSettled permite actualizar varias instancias a la vez. */
Overlook.components.asyncList = {
    mount(root, { load, render, empty = 'No hay resultados.' }) {
        let version = 0, disposed = false;
        async function refresh() {
            const request = ++version;
            root.setAttribute('aria-busy', 'true');
            root.textContent = 'Cargando…';
            try {
                const items = await load();
                if (disposed || request !== version) return;
                root.innerHTML = items.length ? items.map(render).join('') : '';
                if (!items.length) root.textContent = empty;
            } catch (error) {
                if (disposed || request !== version) return;
                root.textContent = error.message;
            } finally {
                if (!disposed && request === version) root.setAttribute('aria-busy', 'false');
            }
        }
        return { refresh, destroy() { disposed = true; version++; root.replaceChildren(); } };
    }
};
Overlook.escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
Overlook.safeRecord = record => Object.fromEntries(Object.entries(record).map(([key,value]) => [key, typeof value === 'string' ? Overlook.escape(value) : value]));
