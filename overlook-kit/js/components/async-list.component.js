/* Lista independiente por contenedor. "Cargando…" solo en la primera carga. */
Overlook.components.asyncList = {
    mount(root, { load, render, empty = 'No hay resultados.', emptyHtml = '' }) {
        let version = 0;
        let disposed = false;
        let loaded = false;
        root.setAttribute('aria-live', 'polite');
        async function refresh() {
            const request = ++version;
            root.setAttribute('aria-busy', 'true');
            if (!loaded) root.textContent = 'Cargando…';
            try {
                const items = await load();
                if (disposed || request !== version) return;
                if (!items.length) {
                    if (emptyHtml) root.innerHTML = emptyHtml;
                    else root.textContent = empty;
                } else {
                    root.innerHTML = items.map(render).join('');
                }
                loaded = true;
            } catch (error) {
                if (disposed || request !== version) return;
                console.error(error);
                if (!loaded) root.textContent = 'No se pudieron cargar los datos. Intenta de nuevo.';
                loaded = true;
            } finally {
                if (!disposed && request === version) root.setAttribute('aria-busy', 'false');
            }
        }
        return {
            refresh,
            destroy() {
                disposed = true;
                version++;
                root.replaceChildren();
            }
        };
    }
};
