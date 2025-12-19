const API_URL = "http://127.0.0.1:5000";
let currentPage = 1;
let allProducts = [];
let filteredProducts = [];

// ===============================
//  UTILIDADES
// ===============================
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// ===============================
//  CARGAR PRODUCTOS
// ===============================
async function loadProducts(page = 1, limit = 12) {
    try {
        const categoryId = getQueryParam("category");
        let url = `${API_URL}/products`;

        if (categoryId) {
            url += `?category=${categoryId}`;
        }

        const response = await fetch(url);
        const products = await response.json();

        allProducts = products;
        filteredProducts = [...products];

        displayProducts(currentPage, limit);
        updatePagination();
    } catch (error) {
        console.error("Error cargando productos:", error);
    }
}

// ===============================
//  MOSTRAR PRODUCTOS
// ===============================
function displayProducts(page = 1, limit = 12) {
    const start = (page - 1) * limit;
    const end = start + limit;
    const productsToShow = filteredProducts.slice(start, end);

    const container = document.getElementById("productsGrid");

    if (productsToShow.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 4rem;">
                <i class="fas fa-search fa-3x" style="color: #ddd;"></i>
                <h3>No se encontraron productos</h3>
                <p>Intenta con otros filtros o categorías</p>
            </div>
        `;
        return;
    }

    container.innerHTML = "";
    productsToShow.forEach(product => {
        container.appendChild(createProductCard(product));
    });

    if (document.getElementById("resultsCount")) {
        document.getElementById("resultsCount").textContent =
            `Mostrando ${productsToShow.length} de ${filteredProducts.length} productos`;
    }
}

// ===============================
//  TARJETA DE PRODUCTO
// ===============================
function createProductCard(product) {
    const div = document.createElement("div");
    div.className = "product-card";

    const mainPhoto = product.photos && product.photos.length > 0
        ? product.photos[0]
        : "/static/images/placeholder.jpg";

    div.innerHTML = `
        <img src="${mainPhoto}" alt="${product.name}" class="product-img"
             onclick="viewProductDetail('${product._id}')" style="cursor:pointer;">
        <div class="product-info">
            <h3 class="product-title" onclick="viewProductDetail('${product._id}')" style="cursor:pointer;">
                ${product.name}
            </h3>
            <p class="product-description">${product.description || "Producto de joyería"}</p>
            <div class="product-meta">
                <span><i class="fas fa-eye"></i> ${product.views || 0}</span>
                <span><i class="fas fa-shopping-bag"></i> ${product.purchases || 0}</span>
            </div>
            <div class="product-price">Bs ${product.price.toFixed(2)}</div>
            <button class="btn btn-primary btn-block" onclick="addToCart('${product._id}')">
                <i class="fas fa-cart-plus"></i> Añadir al Carrito
            </button>
        </div>
    `;
    return div;
}

// ===============================
//  CATEGORÍAS
// ===============================
async function loadCategories() {
    try {
        const response = await fetch(`${API_URL}/categories`);
        const categories = await response.json();

        const select = document.getElementById("categoryFilter");
        if (!select) return;

        select.innerHTML = `<option value="">Todas las categorías</option>`;

        categories.forEach(category => {
            const option = document.createElement("option");
            option.value = category._id;
            option.textContent = category.name;
            select.appendChild(option);
        });

        const selectedCategory = getQueryParam("category");
        if (selectedCategory) {
            select.value = selectedCategory;
        }
    } catch (error) {
        console.error("Error cargando categorías:", error);
    }
}

// ===============================
//  BÚSQUEDA / FILTROS
// ===============================
function searchProducts() {
    const searchTerm = document.getElementById("searchInput").value.toLowerCase();

    filteredProducts = allProducts.filter(p =>
        p.name.toLowerCase().includes(searchTerm) ||
        (p.description && p.description.toLowerCase().includes(searchTerm))
    );

    currentPage = 1;
    displayProducts();
    updatePagination();
}

function filterProducts() {
    const categoryId = document.getElementById("categoryFilter").value;

    filteredProducts = categoryId
        ? allProducts.filter(p => String(p.category_id) === categoryId)
        : [...allProducts];

    currentPage = 1;
    displayProducts();
    updatePagination();
}

// ===============================
//  ORDENAR
// ===============================
function sortProducts() {
    const sortBy = document.getElementById("sortFilter").value;

    filteredProducts.sort((a, b) => {
        switch (sortBy) {
            case "price_asc": return a.price - b.price;
            case "price_desc": return b.price - a.price;
            case "views": return (b.views || 0) - (a.views || 0);
            case "sales": return (b.purchases || 0) - (a.purchases || 0);
            default: return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        }
    });

    displayProducts();
}

// ===============================
//  PAGINACIÓN
// ===============================
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
    document.getElementById("prevPage").disabled = currentPage <= 1;
    document.getElementById("nextPage").disabled = currentPage >= totalPages;
    document.getElementById("pageInfo").textContent = `Página ${currentPage} de ${totalPages}`;
}

// ===============================
//  DETALLE DE PRODUCTO
// ===============================
async function loadProductDetail(productId) {
    try {
        const response = await fetch(`${API_URL}/products/${productId}`);
        const product = await response.json();

        document.getElementById("productTitle").textContent = product.name;
        document.getElementById("productName").textContent = product.name;
        document.getElementById("productDescription").textContent = product.description || "";
        document.getElementById("productPrice").textContent = `Bs ${product.price.toFixed(2)}`;
        document.getElementById("viewsCount").textContent = product.views || 0;
        document.getElementById("salesCount").textContent = product.purchases || 0;
        document.getElementById("breadcrumbProduct").textContent = product.name;
        document.getElementById("breadcrumbCategory").textContent = product.category_name || "Categoría";

        const mainImage = document.getElementById("productMainImage");
        const thumbnails = document.getElementById("productThumbnails");

        if (product.photos?.length) {
            mainImage.src = product.photos[0];
            thumbnails.innerHTML = "";

            product.photos.forEach((photo, index) => {
                const img = document.createElement("img");
                img.src = photo;
                img.style.width = "60px";
                img.style.height = "60px";
                img.style.objectFit = "cover";
                img.style.cursor = "pointer";
                img.style.border = index === 0 ? "2px solid var(--color-primary)" : "none";
                img.onclick = () => {
                    mainImage.src = photo;
                    thumbnails.querySelectorAll("img").forEach(i => i.style.border = "none");
                    img.style.border = "2px solid var(--color-primary)";
                };
                thumbnails.appendChild(img);
            });
        }

        loadRelatedProducts(product.category_id, productId);
    } catch (error) {
        console.error("Error cargando detalle:", error);
    }
}

// ===============================
//  RELACIONADOS
// ===============================
async function loadRelatedProducts(categoryId, excludeId) {
    try {
        const response = await fetch(`${API_URL}/products?category=${categoryId}`);
        const products = await response.json();

        const container = document.getElementById("relatedProducts");
        container.innerHTML = "";

        products.filter(p => p._id !== excludeId).slice(0, 4)
            .forEach(p => container.appendChild(createProductCard(p)));
    } catch (error) {
        console.error("Error cargando relacionados:", error);
    }
}

// ===============================
//  NAVEGACIÓN
// ===============================
function viewProductDetail(productId) {
    window.location.href = `/producto_detalle?id=${productId}`;
}

// ===============================
//  INIT
// ===============================
document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("productsGrid")) {
        loadProducts();
        loadCategories();
    }

    const params = new URLSearchParams(window.location.search);
    const productId = params.get("id");
    if (productId && document.getElementById("productTitle")) {
        loadProductDetail(productId);
    }
});
