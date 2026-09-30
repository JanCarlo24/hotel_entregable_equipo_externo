/* ==========================================================
   PIEZA: Componente: modal de cancelacion
   Paso de armado: 6
   Requiere: core/registry.js
   Expone: #cancel-modal, #confirm-cancel-btn
   ========================================================== */

Overlook.components.cancelModal = `
<div id="cancel-modal" class="hidden fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center">
    <div class="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center">
        <h3 class="text-2xl font-serif text-gray-800 mb-4">¿Cancelar reserva?</h3>
        <p class="text-gray-600 mb-6 text-sm">Esta acción liberará la habitación y no se puede deshacer.</p>
        <div class="flex gap-4 justify-center">
            <button onclick="closeCancelModal()" class="px-4 py-2 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 transition">Regresar</button>
            <button id="confirm-cancel-btn" class="px-4 py-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition shadow-lg shadow-red-500/30">Sí, Cancelar</button>
        </div>
    </div>
</div>
`;
