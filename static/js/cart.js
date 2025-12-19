const API_URL = "http://127.0.0.1:5000";
// Si no hay ID de carrito, generamos uno aleatorio simple para esta sesión
let cartId = localStorage.getItem('cartId');
if (!cartId) {
    cartId = 'cart_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('cartId', cartId);
}

let currentCart = { items: [] };

// Si no existe un cartId, lo creamos
if (!cartId) {
    createCart();
}

// Crear un carrito vacío
async function createCart() {
    try {
        const response = await fetch(`${API_URL}/carts`, {
            method: 'POST',
        });
        const data = await response.json();
        localStorage.setItem('cartId', data.id);  // Guardamos el cartId en el localStorage
        console.log('Carrito creado:', data);
    } catch (error) {
        console.error('Error creando el carrito:', error);
    }
}

// Cargar carrito
async function loadCart() {
    try {
        // Usamos la ruta corregida en app.py
        const response = await fetch(`${API_URL}/api/carts/${cartId}`);
        if (!response.ok) throw new Error("Error al conectar con el servidor");
        
        const data = await response.json();
        currentCart = data; // Asumiendo que devuelve el objeto del carrito
        
        displayCartItems(currentCart.items || []);
        updateCartTotal(calculateTotal(currentCart.items || []));
        
    } catch (error) {
        console.error('Error cargando carrito:', error);
        document.getElementById('cartTable').innerHTML = `<tr><td colspan="5">Error cargando el carrito. Asegúrate que app.py esté corriendo.</td></tr>`;
    }
}

// Mostrar items del carrito
function displayCartItems(items) {
    const tableBody = document.getElementById('cartTable');
    
    if (!items || items.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 3rem;">
                    <i class="fas fa-shopping-cart fa-3x" style="color: #ddd; margin-bottom: 1rem;"></i>
                    <h3>Tu carrito está vacío</h3>
                    <p>Agrega productos para comenzar a comprar</p>
                </td>
            </tr>
        `;
        updateCartTotal(0); // Asegurar que el total sea 0 visualmente
        return;
    }
    
    tableBody.innerHTML = '';
    
    items.forEach((item, index) => {
        // Asegurar que item.image tenga un valor por defecto si falta
        const imgUrl = item.image ? item.image : "https://via.placeholder.com/80";
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <img src="${imgUrl}" alt="${item.name}" 
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
                    <span style="padding: 0 1rem;">${item.quantity}</span>
                </div>
            </td>
            <td>Bs ${(item.price * item.quantity).toFixed(2)}</td>
            <td>
                <button class="btn btn-danger" onclick="removeFromCart(${item.product_id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Remover del carrito (CORREGIDO)
async function removeFromCart(productId) {
    if(!confirm("¿Estás seguro de eliminar este producto?")) return;

    try {
        const response = await fetch(`${API_URL}/api/carts/${cartId}/remove`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ product_id: productId })
        });

        const data = await response.json();

        if (data.success) {
            // Recargar el carrito para ver los cambios
            loadCart();
            showAlert('Producto eliminado correctamente', 'success');
        } else {
            showAlert('No se pudo eliminar el producto', 'error');
        }

    } catch (error) {
        console.error('Error al eliminar:', error);
        showAlert('Error de conexión', 'error');
    }
}

// Calcular total
function calculateTotal(items) {
    if (!items) return 0;
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

// Actualizar total visual
function updateCartTotal(total) {
    const subtotal = total;
    const shipping = subtotal > 0 ? 15.00 : 0; // Solo cobrar envío si hay productos
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

// Mostrar alerta
function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`; // Asegúrate de tener estilos CSS para .alert-success y .alert-error
    alertDiv.style.backgroundColor = type === 'success' ? '#d4edda' : '#f8d7da';
    alertDiv.style.color = type === 'success' ? '#155724' : '#721c24';
    alertDiv.style.padding = '15px';
    alertDiv.style.borderRadius = '5px';
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
document.addEventListener('DOMContentLoaded', loadCart);