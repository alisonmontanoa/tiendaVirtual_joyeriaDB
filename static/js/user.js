const API_URL = "http://127.0.0.1:5000";
let cartId = localStorage.getItem('cartId') || null;

// Cargar categorias destacadas
async function loadFeaturedCategories() {
    try {
        const response = await fetch(`${API_URL}/categories`);
        const categories = await response.json();
        
        const container = document.getElementById('categories-grid');
        container.innerHTML = '';
        
        // Tomar solo 4 categorías para mostrar
        categories.slice(0, 4).forEach(category => {
            const categoryCard = document.createElement('div');
            categoryCard.className = 'product-card';
            categoryCard.innerHTML = `
                <div class="product-info" style="text-align: center;">
                    <i class="fas fa-gem fa-3x" style="color: var(--color-primary); margin-bottom: 1rem;"></i>
                    <h3 class="product-title">${category.name}</h3>
                    <p class="product-description">${category.description || 'Descubre nuestra colección'}</p>
                    <button class="btn btn-outline" onclick="window.location.href='/productos?category=${category._id}'">
                        Ver Productos
                    </button>
                </div>
            `;
            container.appendChild(categoryCard);
        });
    } catch (error) {
        console.error('Error cargando categorías:', error);
    }
}

// Cargar productos destacados
async function loadFeaturedProducts() {
    try {
        const response = await fetch(`${API_URL}/products/most-viewed?limit=6`);
        const products = await response.json();
        
        const container = document.getElementById('featured-products');
        container.innerHTML = '';
        
        products.forEach(product => {
            const productCard = createProductCard(product);
            container.appendChild(productCard);
        });
    } catch (error) {
        console.error('Error cargando productos destacados:', error);
    }
}

// Cargar más vendidos
async function loadBestSellers() {
    try {
        const response = await fetch(`${API_URL}/products/best-sellers?limit=4`);
        const products = await response.json();
        
        const container = document.getElementById('best-sellers');
        container.innerHTML = '';
        
        products.forEach(product => {
            const productCard = createProductCard(product);
            container.appendChild(productCard);
        });
    } catch (error) {
        console.error('Error cargando más vendidos:', error);
    }
}

// Crear tarjeta de producto
function createProductCard(product) {
    const div = document.createElement('div');
    div.className = 'product-card';
    
    const mainPhoto = product.photos && product.photos.length > 0 
        ? product.photos[0] 
        : '/static/images/placeholder.jpg';
    
    div.innerHTML = `
        <div class="product-badge">Destacado</div>
        <img src="${mainPhoto}" alt="${product.name}" class="product-img">
        <div class="product-info">
            <h3 class="product-title">${product.name}</h3>
            <p class="product-description">${product.description || 'Producto de joyería'}</p>
            <div class="product-meta">
                <span><i class="fas fa-eye"></i> ${product.views || 0}</span>
                <span><i class="fas fa-shopping-bag"></i> ${product.purchases || 0}</span>
            </div>
            <div class="product-price">Bs ${product.price.toFixed(2)}</div>
            <div style="display: flex; gap: 0.5rem;">
                <button class="btn btn-primary" onclick="addToCart('${product._id}', '${product.name}', ${product.price})" style="flex: 2;">
                    <i class="fas fa-cart-plus"></i> Añadir
                </button>
                <button class="btn btn-outline" onclick="viewProductDetail('${product._id}')" style="flex: 1;">
                    <i class="fas fa-eye"></i>
                </button>
            </div>
        </div>
    `;
    
    return div;
}

// Ver detalle del producto
function viewProductDetail(productId) {
    window.location.href = `/producto_detalle.html?id=${productId}`;
}

// Crear o obtener carrito
async function getOrCreateCart() {
    if (!cartId) {
        try {
            const response = await fetch(`${API_URL}/carts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            cartId = data.id;
            localStorage.setItem('cartId', cartId);
        } catch (error) {
            console.error('Error creando carrito:', error);
        }
    }
    return cartId;
}

// Añadir al carrito
async function addToCart(productId, productName, productPrice) {
    try {
        const cartId = await getOrCreateCart();
        
        const response = await fetch(`${API_URL}/carts/${cartId}/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                product_id: productId,
                name: productName,
                price: productPrice,
                quantity: 1
            })
        });
        
        if (response.ok) {
            updateCartCount();
            showAlert('Producto añadido al carrito', 'success');
        }
    } catch (error) {
        console.error('Error añadiendo al carrito:', error);
        showAlert('Error al añadir al carrito', 'error');
    }
}

// Actualizar contador del carrito
async function updateCartCount() {
    if (!cartId) return;
    
    try {
        const response = await fetch(`${API_URL}/carts/${cartId}`);
        const cart = await response.json();
        
        const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
        const cartCount = document.querySelector('.cart-count');
        if (cartCount) {
            cartCount.textContent = totalItems;
        }
    } catch (error) {
        console.error('Error actualizando carrito:', error);
    }
}

// Mostrar alerta
function showAlert(message, type) {
    // Crear elemento de alerta si no existe
    let alertDiv = document.getElementById('alertMessage');
    if (!alertDiv) {
        alertDiv = document.createElement('div');
        alertDiv.id = 'alertMessage';
        alertDiv.style.position = 'fixed';
        alertDiv.style.top = '20px';
        alertDiv.style.right = '20px';
        alertDiv.style.zIndex = '3000';
        document.body.appendChild(alertDiv);
    }
    
    alertDiv.innerHTML = `
        <div class="alert alert-${type === 'success' ? 'success' : 'error'}" style="min-width: 300px;">
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            ${message}
        </div>
    `;
    
    setTimeout(() => {
        alertDiv.style.opacity = '0';
        alertDiv.style.transition = 'opacity 0.5s ease';
        setTimeout(() => {
            alertDiv.innerHTML = '';
            alertDiv.style.opacity = '1';
        }, 500);
    }, 3000);
}

// Abrir modal del carrito
function openCart() {
    window.location.href = '/carrito.html';
}

// Cargar todo al iniciar
document.addEventListener('DOMContentLoaded', async function() {
    await loadFeaturedCategories();
    await loadFeaturedProducts();
    await loadBestSellers();
    await updateCartCount();
});