const API_URL = "http://127.0.0.1:5000/api";
let editingProductId = null;
let editingCategoryId = null;

// =========================
// CAMBIO DE SECCIONES
// =========================
function showSection(sectionId) {
    document.querySelectorAll(".section-content").forEach(sec => sec.style.display = "none");
    document.getElementById(sectionId).style.display = "block";

    document.getElementById("sectionTitle").textContent =
        sectionId.charAt(0).toUpperCase() + sectionId.slice(1);

    if (sectionId === "products") loadProducts();
    if (sectionId === "categories") loadCategories();
    if (sectionId === "orders") loadOrders();
    if (sectionId === "dashboard") loadDashboard();
    if (sectionId === "analytics") loadAnalytics();
}


// =========================
// CATEGORÍAS
// =========================

async function loadCategories() {
    const res = await fetch(`${API_URL}/categories`);
    const data = await res.json();

    const table = document.getElementById("categoriesTable");
    table.innerHTML = "";

    data.forEach(cat => {
        table.innerHTML += `
            <tr>
                <td>${cat.name}</td>
                <td>${cat.description}</td>
                <td>—</td>
                <td>
                    <button class="btn btn-small" onclick="editCategory('${cat._id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-small btn-danger" onclick="deleteCategory('${cat._id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

function showCategoryForm() {
    editingCategoryId = null;
    document.getElementById("categoryModalTitle").textContent = "Nueva Categoría";
    document.getElementById("categoryForm").reset();
    document.getElementById("categoryModal").style.display = "flex";
}

function closeCategoryModal() {
    document.getElementById("categoryModal").style.display = "none";
}

async function saveCategory() {
    const name = document.getElementById("categoryName").value;
    const description = document.getElementById("categoryDescription").value;

    const method = editingCategoryId ? "PUT" : "POST";
    const url = editingCategoryId 
        ? `${API_URL}/categories/${editingCategoryId}` 
        : `${API_URL}/categories`;

    const res = await fetch(url, {
        method,
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({name, description})
    });

    if (res.ok) {
        closeCategoryModal();
        loadCategories();
    }
}

async function editCategory(id) {
    editingCategoryId = id;

    const res = await fetch(`${API_URL}/categories/${id}`);
    const cat = await res.json();

    document.getElementById("categoryModalTitle").textContent = "Editar Categoría";
    document.getElementById("categoryName").value = cat.name;
    document.getElementById("categoryDescription").value = cat.description;

    document.getElementById("categoryModal").style.display = "flex";
}

async function deleteCategory(id) {
    if (!confirm("¿Eliminar esta categoría?")) return;

    await fetch(`${API_URL}/categories/${id}`, {method: "DELETE"});
    loadCategories();
}


// =========================
// PRODUCTOS
// =========================

async function loadProducts() {
    const res = await fetch(`${API_URL}/products`);
    const data = await res.json();

    const resCat = await fetch(`${API_URL}/categories`);
    const cats = await resCat.json();

    const table = document.getElementById("productsTable");
    table.innerHTML = "";

    data.forEach(prod => {
        const category = cats.find(c => c._id === prod.category_id);
        const catName = category ? category.name : "Sin categoría";

        table.innerHTML += `
            <tr>
                <td>${prod.name}</td>
                <td>${catName}</td>
                <td>Bs ${prod.price}</td>
                <td>${prod.views}</td>
                <td>${prod.purchases}</td>
                <td>
                    <button class="btn btn-small" onclick="editProduct('${prod._id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-small btn-danger" onclick="deleteProduct('${prod._id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

function showProductForm() {
    editingProductId = null;
    document.getElementById("productModalTitle").textContent = "Nuevo Producto";
    document.getElementById("productForm").reset();
    document.getElementById("photoPreview").innerHTML = "";
    document.getElementById("productModal").style.display = "flex";

    loadCategoryOptions();
}

function closeProductModal() {
    document.getElementById("productModal").style.display = "none";
}

async function loadCategoryOptions() {
    const res = await fetch(`${API_URL}/categories`);
    const data = await res.json();

    const select = document.getElementById("productCategory");
    select.innerHTML = "";

    data.forEach(cat => {
        select.innerHTML += `<option value="${cat._id}">${cat.name}</option>`;
    });
}

async function saveProduct() {
    const form = document.getElementById("productForm");
    const fd = new FormData();

    fd.append("name", document.getElementById("productName").value);
    fd.append("price", document.getElementById("productPrice").value);
    fd.append("description", document.getElementById("productDescription").value);
    fd.append("category_id", document.getElementById("productCategory").value);
    fd.append("type", document.getElementById("productType").value);

    const photos = document.getElementById("productPhotos").files;
    for (let p of photos) fd.append("photos", p);

    const method = editingProductId ? "PUT" : "POST";
    const url = editingProductId 
        ? `${API_URL}/products/${editingProductId}` 
        : `${API_URL}/products`;

    const res = await fetch(url, {
        method,
        body: fd
    });

    if (res.ok) {
        closeProductModal();
        loadProducts();
    }
}

async function editProduct(id) {
    editingProductId = id;

    const res = await fetch(`${API_URL}/products/${id}`);
    const p = await res.json();

    document.getElementById("productModalTitle").textContent = "Editar Producto";

    document.getElementById("productName").value = p.name;
    document.getElementById("productPrice").value = p.price;
    document.getElementById("productDescription").value = p.description;
    document.getElementById("productCategory").value = p.category_id;
    document.getElementById("productType").value = p.type || "joya";

    document.getElementById("photoPreview").innerHTML = p.photos.map(img =>
        `<img src="${img}" class="thumb">`
    ).join("");

    document.getElementById("productModal").style.display = "flex";
}

async function deleteProduct(id) {
    if (!confirm("¿Eliminar producto?")) return;

    await fetch(`${API_URL}/products/${id}`, {method: "DELETE"});
    loadProducts();
}


// =========================
// INICIO
// =========================
document.addEventListener("DOMContentLoaded", () => {
    loadDashboard();
    loadProducts();
    loadCategories();
});
