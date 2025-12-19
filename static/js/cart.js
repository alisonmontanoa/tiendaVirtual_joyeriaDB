const API_URL = "http://127.0.0.1:5000";

// ===============================
//  GESTIÓN DE ID DE CARRITO
// ===============================
let cartId = localStorage.getItem("cartId");
let currentCart = { items: [] };

// Crear carrito si no existe
if (!cartId) {
    createCart();
}

// ===============================
//  CREAR CARRITO
// ===============================
async function createCart() {
    try {
        const res = await fetch(`${API_URL}/carts`, { method: "POST" });
        const data = await res.json();
        cartId = data.id;
        localStorage.setItem("cartId", cartId);
        loadCart();
    } catch (err) {
        console.error("Error creando carrito:", err);
    }
}

// ===============================
//  CARGAR CARRITO
// ===============================
async function loadCart() {
    if (!cartId) return renderEmptyCart();

    try {
        const res = await fetch(`${API_URL}/carts/${cartId}`);
        if (!res.ok) throw new Error("Carrito no encontrado");

        const cart = await res.json();
        currentCart = cart;
        displayCartItems(cart.items || []);
        updateCartTotal(calculateTotal(cart.items || []));
    } catch (err) {
        console.error("Error cargando carrito:", err);
        renderEmptyCart();
    }
}

// ===============================
//  AGREGAR AL CARRITO
//  (solo enviamos product_id)
// ===============================
async function addToCart(productId) {
    if (!cartId) await createCart();

    try {
        const res = await fetch(`${API_URL}/carts/${cartId}/add`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                product_id: productId,
                quantity: 1
            })
        });

        if (res.ok) {
            showAlert("Producto agregado al carrito", "success");
            loadCart();
        } else {
            showAlert("No se pudo agregar el producto", "error");
        }
    } catch (err) {
        console.error("Error agregando producto:", err);
        showAlert("Error de conexión", "error");
    }
}

// ===============================
//  MOSTRAR ITEMS
// ===============================
function displayCartItems(items) {
    const table = document.getElementById("cartTable");
    if (!table) return;

    if (!items || items.length === 0) {
        renderEmptyCart();
        return;
    }

    table.innerHTML = "";

    items.forEach(item => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>
                <div style="display:flex; align-items:center; gap:1rem;">
                    <img src="${item.image || 'https://placehold.co/80'}"
                         style="width:80px;height:80px;object-fit:cover;border-radius:8px;">
                    <div>
                        <strong>${item.name}</strong><br>
                        <small>ID: ${item.product_id}</small>
                    </div>
                </div>
            </td>
            <td>Bs ${item.price.toFixed(2)}</td>
            <td>${item.quantity}</td>
            <td>Bs ${(item.price * item.quantity).toFixed(2)}</td>
            <td>
                <button class="btn btn-danger"
                        onclick="removeFromCart('${item.product_id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        table.appendChild(row);
    });
}

// ===============================
//  ELIMINAR PRODUCTO
// ===============================
async function removeFromCart(productId) {
    if (!confirm("¿Eliminar este producto del carrito?")) return;

    try {
        const res = await fetch(`${API_URL}/carts/${cartId}/add`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                product_id: productId,
                quantity: -9999   // truco simple: backend lo eliminará al no coincidir
            })
        });

        loadCart();
    } catch (err) {
        console.error("Error eliminando producto:", err);
        showAlert("Error al eliminar producto", "error");
    }
}

// ===============================
//  VACIAR CARRITO
// ===============================
async function clearCart() {
    if (!confirm("¿Vaciar carrito?")) return;

    try {
        await fetch(`${API_URL}/carts/${cartId}/clear`, { method: "PUT" });
        currentCart.items = [];
        loadCart();
        showAlert("Carrito vaciado", "success");
    } catch (err) {
        console.error("Error vaciando carrito:", err);
        showAlert("Error al vaciar carrito", "error");
    }
}

// ===============================
//  TOTALES
// ===============================
function calculateTotal(items) {
    return items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
}

function updateCartTotal(total) {
    const shipping = total > 0 ? 15.0 : 0;
    const finalTotal = total + shipping;

    if (document.getElementById("cartTotalPrice"))
        document.getElementById("cartTotalPrice").textContent = `Bs ${total.toFixed(2)}`;

    if (document.getElementById("orderSubtotal"))
        document.getElementById("orderSubtotal").textContent = `Bs ${total.toFixed(2)}`;

    if (document.getElementById("orderTotal"))
        document.getElementById("orderTotal").textContent = `Bs ${finalTotal.toFixed(2)}`;
}

// ===============================
//  CREAR ORDEN
// ===============================
async function createOrder() {
    if (!cartId || currentCart.items.length === 0) {
        showAlert("El carrito está vacío", "error");
        return;
    }

    const paymentMethod = document.getElementById("paymentMethod")?.value || "credit_card";

    try {
        const res = await fetch(`${API_URL}/orders`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                cart_id: cartId,
                payment_method: paymentMethod
            })
        });

        const result = await res.json();

        if (res.ok) {
            showOrderResult(result);
        } else {
            showAlert("Error procesando la orden", "error");
        }
    } catch (err) {
        console.error("Error creando orden:", err);
        showAlert("Error de conexión", "error");
    }
}

// ===============================
//  RESULTADO DE ORDEN
// ===============================
function showOrderResult(result) {
    const modal = document.getElementById("orderModal");
    const success = document.getElementById("orderSuccess");
    const error = document.getElementById("orderError");

    if (result.status === "completed") {
        success.style.display = "block";
        error.style.display = "none";
        document.getElementById("orderNumber").textContent = result.order_number;
        document.getElementById("orderTotalConfirm").textContent = `Bs ${result.total.toFixed(2)}`;

        localStorage.removeItem("cartId");
        cartId = null;
        currentCart.items = [];
    } else {
        success.style.display = "none";
        error.style.display = "block";
    }

    modal.style.display = "flex";
}

// ===============================
//  UTILIDADES
// ===============================
function renderEmptyCart() {
    const table = document.getElementById("cartTable");
    if (!table) return;

    table.innerHTML = `
        <tr>
            <td colspan="5" style="text-align:center;padding:3rem;">
                <i class="fas fa-shopping-cart fa-3x" style="color:#ddd;"></i>
                <h3>Tu carrito está vacío</h3>
                <p>Agrega productos para comenzar a comprar</p>
            </td>
        </tr>
    `;
    updateCartTotal(0);
}

function showAlert(msg, type) {
    const div = document.createElement("div");
    div.className = `alert alert-${type}`;
    div.textContent = msg;
    div.style.position = "fixed";
    div.style.top = "20px";
    div.style.right = "20px";
    div.style.zIndex = "3000";
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
}

// ===============================
//  INIT
// ===============================
document.addEventListener("DOMContentLoaded", loadCart);
