const API_URL = "http://127.0.0.1:5000";
let cartId = localStorage.getItem("cartId");

// ===============================
//  CARRITO (ÚNICA FUENTE)
// ===============================
async function getOrCreateCart() {
    if (!cartId) {
        try {
            const response = await fetch(`${API_URL}/carts`, { method: "POST" });
            const data = await response.json();
            cartId = data.id;
            localStorage.setItem("cartId", cartId);
        } catch (error) {
            console.error("Error creando carrito:", error);
        }
    }
    return cartId;
}

// ===============================
//  CATEGORÍAS DESTACADAS
// ===============================
async function loadFeaturedCategories() {
    try {
        const response = await fetch(`${API_URL}/categories`);
        const categories = await response.json();

        const container = document.getElementById("categories-grid");
        if (!container) return;

        container.innerHTML = "";

        categories.slice(0, 4).forEach(category => {
            const card = document.createElement("div");
            card.className = "product-card";
            card.innerHTML = `
                <div class="product-info" style="text-align:center;">
                    <i class="fas fa-gem fa-3x" style="color:var(--color-primary); margin-bottom:1rem;"></i>
                    <h3 class="product-title">${category.name}</h3>
                    <p class="product-description">${category.description || "Descubre nuestra colección"}</p>
                    <button class="btn btn-outline"
                        onclick="window.location.href='/productos.html?category=${category._id}'">
                        Ver Productos
                    </button>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        console.error("Error cargando categorías:", error);
    }
}

// ===============================
//  PRODUCTOS DESTACADOS
// ===============================
async function loadFeaturedProducts() {
    try {
        const response = await fetch(`${API_URL}/products/most-viewed?limit=6`);
        const products = await response.json();

        const container = document.getElementById("featured-products");
        if (!container) return;

        container.innerHTML = "";
        products.forEach(p => container.appendChild(createProductCard(p)));
    } catch (error) {
        console.error("Error cargando destacados:", error);
    }
}

// ===============================
//  MÁS VENDIDOS
// ===============================
async function loadBestSellers() {
    try {
        const response = await fetch(`${API_URL}/products/best-sellers?limit=4`);
        const products = await response.json();

        const container = document.getElementById("best-sellers");
        if (!container) return;

        container.innerHTML = "";
        products.forEach(p => container.appendChild(createProductCard(p)));
    } catch (error) {
        console.error("Error cargando más vendidos:", error);
    }
}

// ===============================
//  TARJETA DE PRODUCTO
// ===============================
function createProductCard(product) {
    const div = document.createElement("div");
    div.className = "product-card";

    const photo = product.photos?.length
        ? product.photos[0]
        : "/static/images/placeholder.jpg";

    div.innerHTML = `
        <div class="product-badge">Destacado</div>
        <img src="${photo}" alt="${product.name}" class="product-img">
        <div class="product-info">
            <h3 class="product-title">${product.name}</h3>
            <p class="product-description">${product.description || "Producto de joyería"}</p>
            <div class="product-meta">
                <span><i class="fas fa-eye"></i> ${product.views || 0}</span>
                <span><i class="fas fa-shopping-bag"></i> ${product.purchases || 0}</span>
            </div>
            <div class="product-price">Bs ${product.price.toFixed(2)}</div>
            <div style="display:flex; gap:0.5rem;">
                <button class="btn btn-primary" style="flex:2;"
                    onclick="addToCart('${product._id}')">
                    <i class="fas fa-cart-plus"></i> Añadir
                </button>
                <button class="btn btn-outline" style="flex:1;"
                    onclick="viewProductDetail('${product._id}')">
                    <i class="fas fa-eye"></i>
                </button>
            </div>
        </div>
    `;
    return div;
}

// ===============================
//  AÑADIR AL CARRITO
// ===============================
async function addToCart(productId) {
    try {
        const id = await getOrCreateCart();

        const response = await fetch(`${API_URL}/carts/${id}/add`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                product_id: productId,
                quantity: 1
            })
        });

        if (response.ok) {
            updateCartCount();
            showAlert("Producto añadido al carrito", "success");
        } else {
            showAlert("No se pudo añadir al carrito", "error");
        }
    } catch (error) {
        console.error("Error añadiendo al carrito:", error);
        showAlert("Error al añadir al carrito", "error");
    }
}

// ===============================
//  CONTADOR DEL CARRITO
// ===============================
async function updateCartCount() {
    if (!cartId) return;

    try {
        const response = await fetch(`${API_URL}/carts/${cartId}`);
        const cart = await response.json();

        const total = cart.items.reduce((sum, i) => sum + i.quantity, 0);
        const badge = document.querySelector(".cart-count");
        if (badge) badge.textContent = total;
    } catch (error) {
        console.error("Error actualizando contador:", error);
    }
}

// ===============================
//  UTILIDADES UI
// ===============================
function viewProductDetail(productId) {
    window.location.href = `/producto_detalle.html?id=${productId}`;
}

function showAlert(message, type) {
    let alertDiv = document.getElementById("alertMessage");
    if (!alertDiv) {
        alertDiv = document.createElement("div");
        alertDiv.id = "alertMessage";
        alertDiv.style.position = "fixed";
        alertDiv.style.top = "20px";
        alertDiv.style.right = "20px";
        alertDiv.style.zIndex = "3000";
        document.body.appendChild(alertDiv);
    }

    alertDiv.innerHTML = `
        <div class="alert alert-${type === "success" ? "success" : "error"}"
             style="min-width:300px;">
            <i class="fas fa-${type === "success" ? "check-circle" : "exclamation-circle"}"></i>
            ${message}
        </div>
    `;

    setTimeout(() => alertDiv.innerHTML = "", 3000);
}

function openCart() {
    window.location.href = "/carrito.html";
}

// ===============================
//  INIT
// ===============================
document.addEventListener("DOMContentLoaded", async () => {
    await loadFeaturedCategories();
    await loadFeaturedProducts();
    await loadBestSellers();
    await updateCartCount();
});
