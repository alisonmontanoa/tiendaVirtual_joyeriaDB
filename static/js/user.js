document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    updateCartCount();
});

<<<<<<< HEAD
// Si no existe un cartId, lo creamos
if (!cartId) {
    createCart();
}

async function createCart() {
    try {
        const response = await fetch(`${API_URL}/carts`, {
            method: 'POST',
        });
        const data = await response.json();
        cartId = data.id;  // Guardamos el cartId en el localStorage
        localStorage.setItem('cartId', cartId);  // Guardamos el cartId
        console.log('Carrito creado:', data);
    } catch (error) {
        console.error('Error creando el carrito:', error);
    }
}

// Cargar categorias destacadas
async function loadFeaturedCategories() {
=======
// Función para obtener productos de Python y mostrarlos
async function loadProducts() {
>>>>>>> origin/Prueba1
    try {
        const response = await fetch('/api/products');
        const products = await response.json();
        
        // Buscamos el ID que está en tu HTML: featured-products
        const container = document.getElementById('featured-products');
        
        if (!container) return;

        container.innerHTML = ''; // Limpiar el ícono de carga

        products.forEach(product => {
            // Crear tarjeta del producto
            const card = document.createElement('div');
            // Agregamos estilos en línea para asegurar que se vea bien sin tocar CSS
            card.style.cssText = "border: 1px solid #eee; border-radius: 10px; padding: 15px; width: 250px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);";
            
            card.innerHTML = `
                <div style="height: 200px; overflow: hidden; margin-bottom: 15px;">
                    <img src="${product.image}" alt="${product.name}" 
                         style="width: 100%; height: 100%; object-fit: contain;">
                </div>
                <h3 style="font-size: 1.1rem; margin-bottom: 10px;">${product.name}</h3>
                <p style="color: #d4af37; font-weight: bold; font-size: 1.2rem; margin-bottom: 15px;">
                    Bs ${product.price.toFixed(2)}
                </p>
                <button onclick="addToCart(${product.id})" 
                        style="background: #333; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; width: 100%;">
                    Agregar al Carrito
                </button>
            `;
            container.appendChild(card);
        });

    } catch (error) {
        console.error('Error cargando productos:', error);
        document.getElementById('featured-products').innerHTML = '<p>Error al cargar catálogo.</p>';
    }
}

// Función para agregar al carrito
async function addToCart(productId) {
    let cartId = localStorage.getItem('cartId');
    if (!cartId) {
        cartId = 'cart_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('cartId', cartId);
    }

    try {
        const response = await fetch(`/api/carts/${cartId}/add`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ product_id: productId })
        });
        
        if (response.ok) {
            alert("¡Producto agregado!");
            updateCartCount();
        }
    } catch (error) {
        console.error("Error al agregar:", error);
    }
}

// Actualizar contador
async function updateCartCount() {
    let cartId = localStorage.getItem('cartId');
    if (!cartId) return;

    try {
        const response = await fetch(`/api/carts/${cartId}`);
        const data = await response.json();
        const count = data.items ? data.items.reduce((acc, item) => acc + item.quantity, 0) : 0;
        
        const badges = document.querySelectorAll('.cart-count');
        badges.forEach(badge => badge.textContent = count);
    } catch (e) { console.log(e); }
}