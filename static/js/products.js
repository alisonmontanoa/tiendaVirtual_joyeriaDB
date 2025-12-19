const API_URL = "/api";
let allProducts = [];

document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    updateCartCount(); // Actualizar el numerito del carrito al cargar
    
    // Filtros
    document.getElementById('searchInput').addEventListener('input', applyFilters);
    document.getElementById('categoryFilter').addEventListener('change', applyFilters);
    document.getElementById('sortFilter').addEventListener('change', applyFilters);
});

// 1. CARGAR PRODUCTOS
async function loadProducts() {
    const container = document.getElementById('products-grid');
    container.innerHTML = '<div style="width:100%; text-align:center;"><i class="fas fa-spinner fa-spin fa-3x" style="color:#d4af37"></i><p>Cargando...</p></div>';

    try {
        const res = await fetch(`${API_URL}/products`);
        allProducts = await res.json();
        renderProducts(allProducts);
        populateCategoryFilter(allProducts);
    } catch (error) {
        console.error("Error:", error);
        container.innerHTML = '<p>Error al conectar con el servidor.</p>';
    }
}

// 2. MOSTRAR EN PANTALLA
function renderProducts(products) {
    const container = document.getElementById('products-grid');
    container.innerHTML = '';

    if (products.length === 0) {
        container.innerHTML = '<p style="text-align:center; width:100%;">No se encontraron productos.</p>';
        return;
    }

    products.forEach(p => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.style.cssText = "background:white; border:1px solid #eee; border-radius:10px; padding:15px; text-align:center; transition:0.3s;";
        
        // NOTA: Usamos p.image y p.id (coinciden con app.py)
        card.innerHTML = `
            <div style="height:200px; overflow:hidden; margin-bottom:15px;">
                <img src="${p.image}" alt="${p.name}" style="width:100%; height:100%; object-fit:contain;">
            </div>
            <h3 style="font-size:1.1rem; margin-bottom:5px;">${p.name}</h3>
            <p style="color:#888; font-size:0.9rem;">${p.category}</p>
            <div style="color:#d4af37; font-weight:bold; font-size:1.2rem; margin:10px 0;">Bs ${p.price.toFixed(2)}</div>
            <button onclick="addToCart(${p.id})" style="background:#333; color:white; border:none; padding:10px 20px; border-radius:5px; cursor:pointer; width:100%;">
                <i class="fas fa-cart-plus"></i> Agregar al Carrito
            </button>
        `;
        container.appendChild(card);
    });
}

// 3. AGREGAR AL CARRITO (¡ESTA ES LA PARTE QUE FALTABA!)
async function addToCart(productId) {
    let cartId = localStorage.getItem('cartId');
    if (!cartId) {
        cartId = 'cart_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('cartId', cartId);
    }

    try {
        const res = await fetch(`${API_URL}/carts/${cartId}/add`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ product_id: productId })
        });

        if (res.ok) {
            updateCartCount(); // Actualizar contador y modal
            openCartModal();   // Abrir modal automáticamente para ver que se agregó
            
            // Alerta bonita
            Swal.fire({
                icon: 'success',
                title: '¡Agregado!',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 1500
            });
        } else {
            Swal.fire('Error', 'No se pudo agregar el producto', 'error');
        }
    } catch (e) {
        console.error(e);
        Swal.fire('Error', 'Fallo de conexión', 'error');
    }
}

// 4. ACTUALIZAR MODAL DEL CARRITO
async function updateCartCount() {
    let cartId = localStorage.getItem('cartId');
    if (!cartId) return;

    try {
        const res = await fetch(`${API_URL}/carts/${cartId}`);
        const cart = await res.json();
        
        // Actualizar número rojo
        const count = cart.items ? cart.items.reduce((acc, item) => acc + item.quantity, 0) : 0;
        document.querySelectorAll('.cart-count').forEach(el => el.textContent = count);
        
        // Llenar el modal
        const modalItems = document.getElementById('cartModalItems');
        const modalTotal = document.getElementById('cartModalTotal');
        
        if (modalItems) {
            modalItems.innerHTML = '';
            let total = 0;
            
            if (cart.items.length === 0) {
                modalItems.innerHTML = '<p style="text-align:center; padding:20px;">Carrito vacío</p>';
            } else {
                cart.items.forEach(item => {
                    total += item.price * item.quantity;
                    modalItems.innerHTML += `
                        <div style="display:flex; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid #eee; padding-bottom:5px;">
                            <div style="display:flex; gap:10px;">
                                <img src="${item.image}" style="width:40px; height:40px; object-fit:cover;">
                                <div>
                                    <div style="font-weight:bold; font-size:0.9rem;">${item.name}</div>
                                    <small>${item.quantity} x Bs ${item.price}</small>
                                </div>
                            </div>
                            <strong>Bs ${(item.price * item.quantity).toFixed(2)}</strong>
                        </div>
                    `;
                });
            }
            if (modalTotal) modalTotal.textContent = `Bs ${total.toFixed(2)}`;
        }
    } catch (e) { console.error(e); }
}

// 5. FUNCIONES DEL MODAL
function openCartModal() {
    const modal = document.getElementById('cartModal');
    if(modal) modal.style.display = 'flex';
    updateCartCount();
}

function closeCartModal() {
    const modal = document.getElementById('cartModal');
    if(modal) modal.style.display = 'none';
}

// 6. FILTROS
function applyFilters() {
    const term = document.getElementById('searchInput').value.toLowerCase();
    const cat = document.getElementById('categoryFilter').value;
    const sort = document.getElementById('sortFilter').value;

    let filtered = allProducts.filter(p => {
        const matchesTerm = p.name.toLowerCase().includes(term);
        const matchesCat = cat === 'all' || p.category === cat;
        return matchesTerm && matchesCat;
    });

    if(sort === 'price-asc') filtered.sort((a,b) => a.price - b.price);
    if(sort === 'price-desc') filtered.sort((a,b) => b.price - a.price);

    renderProducts(filtered);
}

function populateCategoryFilter(products) {
    const select = document.getElementById('categoryFilter');
    const cats = [...new Set(products.map(p => p.category))];
    select.innerHTML = '<option value="all">Todas las categorías</option>';
    cats.forEach(c => select.innerHTML += `<option value="${c}">${c}</option>`);
}