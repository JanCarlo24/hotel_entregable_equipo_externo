Overlook.components.cancelModal = `
<div id="cancel-modal" class="hidden" role="dialog" aria-modal="true" aria-labelledby="cancel-title" aria-hidden="true" hidden>
    <div class="modal-panel">
        <h2 id="cancel-title">¿Cancelar reserva?</h2>
        <p>Esta acción liberará la habitación y no se puede deshacer.</p>
        <div class="modal-actions">
            <button type="button" class="secondary-button" data-action="close-cancel">Regresar</button>
            <button type="button" class="btn-danger" id="confirm-cancel-btn">Sí, cancelar</button>
        </div>
    </div>
</div>`;
