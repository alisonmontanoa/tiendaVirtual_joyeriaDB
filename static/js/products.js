const API_URL = "http://127.0.0.1:5000";

function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// Cargar productos
async function loadProducts(page = 1, limit = 12) {
    try {
        const response = await fetch(`${API_URL}/products`);
        const products = await response.json();
        
        allProducts = products;
        filteredProducts = [...products];
        
        displayProducts(page, limit);
        updatePagination();
        
    } catch (error) {
        console.error('Error cargando productos:', error);
    }
}

async function loadProductsPage() {
    const categoryId = getQueryParam("category");

    let url;

    if (categoryId) {
        // MOSTRAR SOLO LOS PRODUCTOS DE ESA CATEGORIA
        url = `${API_URL}/products/category/${categoryId}`;
    } else {
        // MOSTRAR TODOS LOS PRODUCTOS
        url = `${API_URL}/products`;
    }

    try {
        const response = await fetch(url);
        const products = await response.json();

        const container = document.getElementById("products-grid");
        container.innerHTML = "";

        products.forEach(product => {
            const card = createProductCard(product);
            container.appendChild(card);
        });

    } catch (error) {
        console.error("Error cargando productos:", error);
    }
}

// Mostrar productos
function displayProducts(page = 1, limit = 12) {
    const start = (page - 1) * limit;
    const end = start + limit;
    const productsToShow = filteredProducts.slice(start, end);
    
    const container = document.getElementById('productsGrid');
    
    if (productsToShow.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 4rem;">
                <i class="fas fa-search fa-3x" style="color: #ddd; margin-bottom: 1rem;"></i>
                <h3>No se encontraron productos</h3>
                <p>Intenta con otros filtros o categorías</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    productsToShow.forEach(product => {
        const productCard = createProductCard(product);
        container.appendChild(productCard);
    });
    
    // Actualizar contador
    if (document.getElementById('resultsCount')) {
        document.getElementById('resultsCount').textContent = 
            `Mostrando ${productsToShow.length} de ${filteredProducts.length} productos`;
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
        <img src="${mainPhoto}" alt="${product.name}" class="product-img" 
             onclick="viewProductDetail('${product._id}')" style="cursor: pointer;">
        <div class="product-info">
            <h3 class="product-title" onclick="viewProductDetail('${product._id}')" style="cursor: pointer;">
                ${product.name}
            </h3>
            <p class="product-description">${product.description || 'Producto de joyería'}</p>
            <div class="product-meta">
                <span><i class="fas fa-eye"></i> ${product.views || 0}</span>
                <span><i class="fas fa-shopping-bag"></i> ${product.purchases || 0}</span>
            </div>
            <div class="product-price">Bs ${product.price.toFixed(2)}</div>
            <button class="btn btn-primary btn-block" onclick="addToCart('${product._id}', '${product.name}', ${product.price})">
                <i class="fas fa-cart-plus"></i> Añadir al Carrito
            </button>
        </div>
    `;
    
    return div;
}

// Cargar categorías para filtro
async function loadCategories() {
    try {
        const response = await fetch(`${API_URL}/categories`);
        const categories = await response.json();
        
        const select = document.getElementById('categoryFilter');
        if (select) {
            select.innerHTML = '<option value="">Todas las categorías</option>';
            
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category._id;
                option.textContent = category.name;
                select.appendChild(option);
            });
        }
        
    } catch (error) {
        console.error('Error cargando categorías:', error);
    }
}

// Buscar productos
function searchProducts() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    filteredProducts = allProducts.filter(product => 
        product.name.toLowerCase().includes(searchTerm) ||
        (product.description && product.description.toLowerCase().includes(searchTerm))
    );
    
    currentPage = 1;
    displayProducts();
    updatePagination();
}

// Filtrar por categoría
function filterProducts() {
    const categoryId = document.getElementById('categoryFilter').value;
    
    if (!categoryId) {
        filteredProducts = [...allProducts];
    } else {
        filteredProducts = allProducts.filter(product => 
            product.category_id === categoryId
        );
    }
    
    currentPage = 1;
    displayProducts();
    updatePagination();
}

// Ordenar productos
function sortProducts() {
    const sortBy = document.getElementById('sortFilter').value;
    
    filteredProducts.sort((a, b) => {
        switch(sortBy) {
            case 'price_asc':
                return a.price - b.price;
            case 'price_desc':
                return b.price - a.price;
            case 'views':
                return (b.views || 0) - (a.views || 0);
            case 'sales':
                return (b.purchases || 0) - (a.purchases || 0);
            default: // newest
                return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        }
    });
    
    displayProducts();
}

// Paginación
function changePage(direction) {
    const totalPages = Math.ceil(filteredProducts.length / 12);
    const newPage = currentPage + direction;
    
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        displayProducts(currentPage);
        updatePagination();
    }
}

function updatePagination() {
    const totalPages = Math.ceil(filteredProducts.length / 12);
    
    document.getElementById('prevPage').disabled = currentPage <= 1;
    document.getElementById('nextPage').disabled = currentPage >= totalPages;
    document.getElementById('pageInfo').textContent = `Página ${currentPage} de ${totalPages}`;
    
    totalPages = totalPages; // Actualizar variable global
}

// Cargar detalle del producto
async function loadProductDetail(productId) {
    try {
        const response = await fetch(`${API_URL}/products/${productId}`);
        const product = await response.json();
        
        // Actualizar información de la página
        document.getElementById('productTitle').textContent = product.name;
        document.getElementById('productName').textContent = product.name;
        document.getElementById('productDescription').textContent = product.description || '';
        document.getElementById('productPrice').textContent = `Bs ${product.price.toFixed(2)}`;
        document.getElementById('viewsCount').textContent = product.views || 0;
        document.getElementById('salesCount').textContent = product.purchases || 0;
        
        // Actualizar imágenes
        const mainImage = document.getElementById('productMainImage');
        const thumbnails = document.getElementById('productThumbnails');
        
        if (product.photos && product.photos.length > 0) {
            mainImage.src = product.photos[0];
            thumbnails.innerHTML = '';
            
            product.photos.forEach((photo, index) => {
                const thumb = document.createElement('img');
                thumb.src = photo;
                thumb.style.width = '60px';
                thumb.style.height = '60px';
                thumb.style.objectFit = 'cover';
                thumb.style.cursor = 'pointer';
                thumb.style.borderRadius = '5px';
                thumb.style.border = index === 0 ? '2px solid var(--color-primary)' : 'none';
                thumb.onclick = () => {
                    mainImage.src = photo;
                    // Remover borde de todas las thumbs
                    thumbnails.querySelectorAll('img').forEach(img => {
                        img.style.border = 'none';
                    });
                    // Agregar borde a la thumb seleccionada
                    thumb.style.border = '2px solid var(--color-primary)';
                };
                thumbnails.appendChild(thumb);
            });
        }
        
        // Actualizar características
        const characteristicsDiv = document.getElementById('productCharacteristics');
        if (product.characteristics && typeof product.characteristics === 'object') {
            characteristicsDiv.innerHTML = '';
            
            Object.entries(product.characteristics).forEach(([key, value]) => {
                const charDiv = document.createElement('div');
                charDiv.innerHTML = `
                    <div style="font-weight: 600; color: var(--color-dark);">${key}:</div>
                    <div style="color: var(--color-gray);">${value}</div>
                `;
                characteristicsDiv.appendChild(charDiv);
            });
        }
        
        // Registrar vista
        await fetch(`${API_URL}/products/${productId}/view`, {
            method: 'POST'
        });
        
        // Cargar productos relacionados (misma categoría)
        loadRelatedProducts(product.category_id, productId);
        
    } catch (error) {
        console.error('Error cargando detalle del producto:', error);
    }
}

// Cargar productos relacionados
async function loadRelatedProducts(categoryId, excludeId) {
    try {
        const response = await fetch(`${API_URL}/products/category/${categoryId}`);
        const products = await response.json();
        
        const container = document.getElementById('relatedProducts');
        container.innerHTML = '';
        
        // Filtrar el producto actual y tomar máximo 4 productos
        const relatedProducts = products
            .filter(p => p._id !== excludeId)
            .slice(0, 4);
        
        if (relatedProducts.length === 0) {
            container.innerHTML = '<p>No hay productos relacionados disponibles.</p>';
            return;
        }
        
        relatedProducts.forEach(product => {
            const productCard = createProductCard(product);
            container.appendChild(productCard);
        });
        
    } catch (error) {
        console.error('Error cargando productos relacionados:', error);
    }
}

// Funciones auxiliares
function viewProductDetail(productId) {
    window.location.href = `/producto_detalle.html?id=${productId}`;
}

async function addToCart(productId, productName, productPrice) {
    // Similar a la función en user.js
    // Implementar según necesidad
}

// Inicializar
if (document.getElementById('productsGrid')) {
    document.addEventListener('DOMContentLoaded', function() {
        loadProducts();
        loadCategories();
    });
}