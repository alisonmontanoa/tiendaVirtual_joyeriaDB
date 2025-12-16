const API_URL = "http://127.0.0.1:5000";

// Cargar ordenes
async function loadOrders() {
    try {
        const response = await fetch(`${API_URL}/orders`);
        const orders = await response.json();
        
        displayOrders(orders);
        
    } catch (error) {
        console.error('Error cargando órdenes:', error);
    }
}

// Mostrar ordenes
function displayOrders(orders) {
    const container = document.getElementById('ordersList');
    const noOrdersDiv = document.getElementById('noOrders');
    
    if (orders.length === 0) {
        container.innerHTML = '';
        noOrdersDiv.style.display = 'block';
        return;
    }
    
    noOrdersDiv.style.display = 'none';
    container.innerHTML = '';
    
    // Ordenar por fecha (mas reciente primero)
    orders.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    orders.forEach(order => {
        const orderCard = createOrderCard(order);
        container.appendChild(orderCard);
    });
}

// Crear tarjeta de orden
function createOrderCard(order) {
    const div = document.createElement('div');
    div.className = 'table-container';
    div.style.marginBottom = '1.5rem';
    
    const statusClass = order.status === 'completed' ? 'badge-success' : 
                      order.status === 'payment_failed' ? 'badge-danger' : 'badge-warning';
    
    div.innerHTML = `
        <div class="table-header" style="display: flex; justify-content: space-between; align-items: center;">
            <div>
                <h3 style="margin: 0;">Orden: ${order.order_number}</h3>
                <p style="margin: 0.5rem 0 0; color: #666; font-size: 0.9rem;">
                    <i class="fas fa-calendar"></i> ${order.date}
                </p>
            </div>
            <div style="display: flex; align-items: center; gap: 1rem;">
                <span class="badge ${statusClass}">${order.status}</span>
                <span style="font-size: 1.2rem; font-weight: bold; color: var(--color-primary);">
                    Bs ${order.total.toFixed(2)}
                </span>
            </div>
        </div>
        <div style="padding: 1.5rem;">
            <div style="margin-bottom: 1rem;">
                <strong>Método de pago:</strong> ${order.payment_method}
            </div>
            <div style="margin-bottom: 1.5rem;">
                <strong>Productos:</strong>
                <ul style="margin-top: 0.5rem;">
                    ${order.items.map(item => `
                        <li style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #eee;">
                            <span>${item.name} x${item.quantity}</span>
                            <span>Bs ${(item.price * item.quantity).toFixed(2)}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 0.5rem;">
                <button class="btn btn-outline" onclick="downloadInvoice('${order._id}')">
                    <i class="fas fa-download"></i> Factura
                </button>
                <button class="btn btn-primary" onclick="trackOrder('${order._id}')">
                    <i class="fas fa-truck"></i> Seguir Envío
                </button>
            </div>
        </div>
    `;
    
    return div;
}

// Buscar orden
async function searchOrder() {
    const searchInput = document.getElementById('searchOrderInput');
    const orderNumber = searchInput.value.trim();
    
    if (!orderNumber) {
        loadOrders();
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/orders/number/${orderNumber}`);
        
        if (response.ok) {
            const order = await response.json();
            displayOrders([order]);
        } else {
            const container = document.getElementById('ordersList');
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem;">
                    <i class="fas fa-search fa-3x" style="color: #ddd; margin-bottom: 1rem;"></i>
                    <h3>Orden no encontrada</h3>
                    <p>Verifica el número de orden e intenta nuevamente.</p>
                </div>
            `;
        }
        
    } catch (error) {
        console.error('Error buscando orden:', error);
    }
}

// Descargar factura (simulado)
function downloadInvoice(orderId) {
    showAlert('Descargando factura...', 'success');
    setTimeout(() => {
        showAlert('Factura descargada', 'success');
    }, 1000);
}

// Seguir envio (simulado)
function trackOrder(orderId) {
    showAlert('Redirigiendo a seguimiento de envío...', 'info');
}

// Mostrar alerta
function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type === 'success' ? 'success' : type === 'error' ? 'error' : 'info'}`;
    alertDiv.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        ${message}
    `;
    
    alertDiv.style.position = 'fixed';
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '3000';
    alertDiv.style.minWidth = '300px';
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}

// Inicializar
document.addEventListener('DOMContentLoaded', loadOrders);