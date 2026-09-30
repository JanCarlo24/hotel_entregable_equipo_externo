/* ==========================================================
   PIEZA: Vista: Checkout / pago
   Paso de armado: 7
   Requiere: core/registry.js
   Expone: #view-checkout
   ========================================================== */

Overlook.views.checkout = `
<section id="view-checkout" class="hidden min-h-screen bg-overlook-bg pt-28 pb-12 flex items-center justify-center">
    <div class="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full mx-4">
        <h2 class="text-3xl font-serif text-center mb-2" id="checkout-title">Completar Reserva</h2>
        <p class="text-center text-gray-500 mb-6 text-sm" id="checkout-price"></p>
        <form id="checkout-form" class="space-y-4">
            <!-- Selección de Fechas -->
            <div class="flex gap-4 mb-2">
                <div class="w-1/2">
                    <label class="block text-sm font-semibold mb-1">Llegada</label>
                    <input type="date" id="checkin-date" class="w-full px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-overlook-pink" required>
                </div>
                <div class="w-1/2">
                    <label class="block text-sm font-semibold mb-1">Salida</label>
                    <input type="date" id="checkout-date" class="w-full px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-overlook-pink" required>
                </div>
            </div>

            <div>
                <label class="block text-sm font-semibold mb-1">Número de Tarjeta (Simulado)</label>
                <input type="text" placeholder="1234 5678 9101 1121" maxlength="19" class="w-full px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-overlook-pink" required>
            </div>
            <div class="flex gap-4">
                <div class="w-1/2">
                    <label class="block text-sm font-semibold mb-1">Vencimiento</label>
                    <input type="text" placeholder="MM/YY" maxlength="5" class="w-full px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-overlook-pink" required>
                </div>
                <div class="w-1/2">
                    <label class="block text-sm font-semibold mb-1">CVV</label>
                    <input type="text" placeholder="123" maxlength="3" class="w-full px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-overlook-pink" required>
                </div>
            </div>
            <button type="submit" class="w-full mt-6 bg-gradient-to-r from-purple-400 to-pink-400 text-white py-3 rounded-full font-semibold shadow-lg hover:opacity-90 transition">
                Confirmar y Pagar
            </button>
            <button type="button" onclick="navigate('rooms')" class="w-full mt-2 bg-transparent text-gray-500 py-2 rounded-full text-sm hover:underline">
                Cancelar
            </button>
        </form>
    </div>
</section>
`;
