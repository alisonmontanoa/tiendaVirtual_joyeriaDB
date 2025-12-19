const API_URL = "http://127.0.0.1:5000";

// ===============================
//  ESTADO GLOBAL
// ===============================
let cartId = localStorage.getItem("cartId");
let currentCart = { items: [] };

// ===============================
//  INICIALIZACIÓN
// ===============================
document.addEventListener("DOMContentLoaded", async () => {
    if (!cartId) {
        await createCart();
    }
    loadCart();
    updateCartCount();
});

// ===============================
//  CREAR CARRITO
// ===============================
async function createCart() {
    try {
        const res = await fetch(`${API_URL}/carts`, { method: "POST" });
        const data = await res.json();
        cartId = data.id;
        localStorage.setItem("cartId", cartId);
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
        updateTotals(cart.items || []);
        updateCartCount();
    } catch (err) {
        console.error("Error cargando carrito:", err);
        renderEmptyCart();
    }
}

// ===============================
//  AGREGAR PRODUCTO
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

        if (!res.ok) throw new Error("Error al agregar");

        showAlert("Producto agregado al carrito", "success");
        loadCart();
    } catch (err) {
        console.error(err);
        showAlert("No se pudo agregar el producto", "error");
    }
}

// ===============================
//  MOSTRAR ITEMS
// ===============================
function displayCartItems(items) {
    const table = document.getElementById("cartTable");
    if (!table) return;

    if (!items.length) {
        renderEmptyCart();
        return;
    }

    table.innerHTML = "";

    items.forEach(item => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>
                <div style="display:flex;gap:1rem;align-items:center;">
                    <img src="${item.image || '/static/images/placeholder.jpg'}"
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
//  ELIMINAR PRODUCTO (CORRECTO)
// ===============================
async function removeFromCart(productId) {
    if (!confirm("¿Eliminar este producto del carrito?")) return;

    try {
        await fetch(`${API_URL}/carts/${cartId}/item/${productId}`, {
            method: "DELETE"
        });

        loadCart();
        showAlert("Producto eliminado", "success");
    } catch (err) {
        console.error(err);
        showAlert("Error al eliminar producto", "error");
    }
}

// ===============================
//  VACIAR CARRITO
// ===============================
async function clearCart() {
    if (!confirm("¿Vaciar carrito completo?")) return;

    try {
        await fetch(`${API_URL}/carts/${cartId}/clear`, { method: "PUT" });
        currentCart.items = [];
        loadCart();
        showAlert("Carrito vaciado", "success");
    } catch (err) {
        console.error(err);
        showAlert("Error al vaciar carrito", "error");
    }
}

// ===============================
//  TOTALES
// ===============================
function updateTotals(items) {
    const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    if (document.getElementById("cartTotal"))
        document.getElementById("cartTotal").textContent = total.toFixed(2);

    if (document.getElementById("cartTotalPrice"))
        document.getElementById("cartTotalPrice").textContent = `Bs ${total.toFixed(2)}`;
}

// ===============================
//  CONTADOR DEL CARRITO
// ===============================
function updateCartCount() {
    const count = currentCart.items
        ? currentCart.items.reduce((sum, i) => sum + i.quantity, 0)
        : 0;

    document.querySelectorAll(".cart-count").forEach(el => {
        el.textContent = count;
    });
}

// ===============================
//  CARRITO VACÍO
// ===============================
function renderEmptyCart() {
    const table = document.getElementById("cartTable");
    if (!table) return;

    table.innerHTML = `
        <tr>
            <td colspan="5" style="text-align:center;padding:3rem;">
                <i class="fas fa-shopping-cart fa-3x" style="color:#ddd;"></i>
                <h3>Tu carrito está vacío</h3>
                <p>Agrega productos para comenzar</p>
            </td>
        </tr>
    `;

    if (document.getElementById("cartTotal"))
        document.getElementById("cartTotal").textContent = "0.00";

    updateCartCount();
}

// ===============================
//  ALERTAS
// ===============================
function showAlert(message, type = "success") {
    const alert = document.createElement("div");
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    alert.style.position = "fixed";
    alert.style.top = "20px";
    alert.style.right = "20px";
    alert.style.zIndex = "9999";

    document.body.appendChild(alert);
    setTimeout(() => alert.remove(), 3000);
}

