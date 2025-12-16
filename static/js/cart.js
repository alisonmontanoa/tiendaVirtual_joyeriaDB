const API_URL = "http://127.0.0.1:5000";
let cartId = localStorage.getItem('cartId');
let currentCart = { items: [] };

// Cargar carrito
async function loadCart() {
    if (!cartId) {
        document.getElementById('cartTable').innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 3rem;">
                    <i class="fas fa-shopping-cart fa-3x" style="color: #ddd; margin-bottom: 1rem;"></i>
                    <h3>Tu carrito está vacío</h3>
                    <p>Agrega productos para comenzar a comprar</p>
                </td>
            </tr>
        `;
        updateCartTotal(0);
        return;
    }

    try {
        const response = await fetch(`${API_URL}/carts/${cartId}`);
        currentCart = await response.json();
        
        displayCartItems(currentCart.items);
        updateCartTotal(calculateTotal(currentCart.items));
        updateCartCount();
        
    } catch (error) {
        console.error('Error cargando carrito:', error);
    }
}

// Mostrar items del carrito
function displayCartItems(items) {
    const tableBody = document.getElementById('cartTable');
    
    if (items.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 3rem;">
                    <i class="fas fa-shopping-cart fa-3x" style="color: #ddd; margin-bottom: 1rem;"></i>
                    <h3>Tu carrito está vacío</h3>
                    <p>Agrega productos para comenzar a comprar</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = '';
    
    items.forEach((item, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <img src="https://via.placeholder.com/80" alt="${item.name}" 
                         style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;">
                    <div>
                        <div style="font-weight: 600;">${item.name}</div>
                        <div style="font-size: 0.9rem; color: #666;">ID: ${item.product_id}</div>
                    </div>
                </div>
            </td>
            <td>Bs ${item.price.toFixed(2)}</td>
            <td>
                <div class="cart-quantity">
                    <button class="quantity-btn" onclick="updateQuantity(${index}, -1)">-</button>
                    <span style="padding: 0 1rem;">${item.quantity}</span>
                    <button class="quantity-btn" onclick="updateQuantity(${index}, 1)">+</button>
                </div>
            </td>
            <td>Bs ${(item.price * item.quantity).toFixed(2)}</td>
            <td>
                <button class="btn btn-danger" onclick="removeFromCart(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Actualizar cantidad
async function updateQuantity(itemIndex, change) {
    const item = currentCart.items[itemIndex];
    const newQuantity = item.quantity + change;
    
    if (newQuantity < 1) {
        removeFromCart(itemIndex);
        return;
    }
    
    // Actualizar localmente
    item.quantity = newQuantity;
    
    // Actualizar en servidor (podría requerir endpoint específico)
    await syncCartWithServer();
    
    // Actualizar vista
    displayCartItems(currentCart.items);
    updateCartTotal(calculateTotal(currentCart.items));
}

// Remover del carrito
async function removeFromCart(itemIndex) {
    currentCart.items.splice(itemIndex, 1);
    await syncCartWithServer();
    loadCart();
}

// Sincronizar carrito con servidor
async function syncCartWithServer() {
    if (!cartId) return;
    
    try {
        // Primero vaciar carrito
        await fetch(`${API_URL}/carts/${cartId}/clear`, {
            method: 'PUT'
        });
        
        // Luego agregar cada item actualizado
        for (const item of currentCart.items) {
            await fetch(`${API_URL}/carts/${cartId}/add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    product_id: item.product_id,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity
                })
            });
        }
        
    } catch (error) {
        console.error('Error sincronizando carrito:', error);
    }
}

// Calcular total
function calculateTotal(items) {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

// Actualizar total
function updateCartTotal(total) {
    const subtotal = total;
    const shipping = 15.00;
    const finalTotal = subtotal + shipping;
    
    if (document.getElementById('cartTotalPrice')) {
        document.getElementById('cartTotalPrice').textContent = `Bs ${total.toFixed(2)}`;
    }
    if (document.getElementById('orderSubtotal')) {
        document.getElementById('orderSubtotal').textContent = `Bs ${subtotal.toFixed(2)}`;
    }
    if (document.getElementById('orderTotal')) {
        document.getElementById('orderTotal').textContent = `Bs ${finalTotal.toFixed(2)}`;
    }
}

// Vaciar carrito
async function clearCart() {
    if (!cartId || !confirm('¿Estás seguro de vaciar el carrito?')) return;
    
    try {
        await fetch(`${API_URL}/carts/${cartId}/clear`, {
            method: 'PUT'
        });
        
        currentCart.items = [];
        loadCart();
        showAlert('Carrito vaciado', 'success');
        
    } catch (error) {
        console.error('Error vaciando carrito:', error);
        showAlert('Error al vaciar el carrito', 'error');
    }
}

// Crear orden
async function createOrder() {
    if (!cartId || currentCart.items.length === 0) {
        showAlert('El carrito está vacío', 'error');
        return;
    }
    
    const paymentMethod = document.getElementById('paymentMethod').value;
    
    try {
        const response = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                cart_id: cartId,
                payment_method: paymentMethod
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showOrderResult(result);
        } else {
            showAlert('Error creando la orden', 'error');
        }
        
    } catch (error) {
        console.error('Error creando orden:', error);
        showAlert('Error al procesar la orden', 'error');
    }
}

// Mostrar resultado de la orden
function showOrderResult(result) {
    const modal = document.getElementById('orderModal');
    const successDiv = document.getElementById('orderSuccess');
    const errorDiv = document.getElementById('orderError');
    
    if (result.payment_approved) {
        successDiv.style.display = 'block';
        errorDiv.style.display = 'none';
        document.getElementById('orderNumber').textContent = result.order_number;
        document.getElementById('orderTotalConfirm').textContent = `Bs ${result.total.toFixed(2)}`;
        
        // Limpiar carrito
        currentCart.items = [];
        localStorage.removeItem('cartId');
        cartId = null;
        
    } else {
        successDiv.style.display = 'none';
        errorDiv.style.display = 'block';
    }
    
    modal.style.display = 'flex';
}

// Mostrar alerta
function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
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

// Cargar al inicio
if (document.getElementById('cartTable')) {
    document.addEventListener('DOMContentLoaded', loadCart);
}