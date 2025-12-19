const API_URL = "/api"; 

(function comprobarAcceso() {
    if (localStorage.getItem('admin_logueado') !== 'si') {
        window.location.href = '/login';
    }
})();

// Variables globales
let currentCharts = {};
let categoriesList = [];

// =========================
// 1. NAVEGACIÓN
// =========================
document.addEventListener('DOMContentLoaded', () => {
    showSection('dashboard');
});

function showSection(sectionId) {
    document.querySelectorAll(".section-content").forEach(sec => sec.style.display = "none");
    document.querySelectorAll(".admin-menu a").forEach(a => a.classList.remove("active"));

    const targetSection = document.getElementById(sectionId);
    if(targetSection) targetSection.style.display = "block";
    
    const activeLink = document.querySelector(`a[href="#${sectionId}"]`);
    if(activeLink) activeLink.classList.add("active");

    const titleMap = {
        'dashboard': 'Dashboard de Ventas',
        'products': 'Gestión de Inventario',
        'categories': 'Categorías',
        'orders': 'Control de Órdenes'
    };
    document.getElementById("sectionTitle").textContent = titleMap[sectionId] || 'Admin';

    const addBtn = document.getElementById("globalAddBtn");
    if (sectionId === 'products' || sectionId === 'categories') {
        addBtn.style.display = "inline-block";
        document.getElementById("addBtnText").textContent = sectionId === 'products' ? "Nuevo Producto" : "Nueva Categoría";
    } else {
        addBtn.style.display = "none";
    }

    if (sectionId === "dashboard") loadDashboardStats();
    if (sectionId === "products") loadProducts();
    if (sectionId === "categories") loadCategories();
    if (sectionId === "orders") loadOrdersTable();
}

function handleGlobalAdd() {
    const productsVisible = document.getElementById('products').style.display !== 'none';
    const categoriesVisible = document.getElementById('categories').style.display !== 'none';

    if (productsVisible) showProductForm();
    if (categoriesVisible) showCategoryForm();
}

function logout() {
    localStorage.removeItem('admin_logueado');
    window.location.href = '/login';
}

// =========================
// 2. GESTIÓN DE PRODUCTOS
// =========================
async function loadProducts() {
    toggleLoading(true);
    try {
        const res = await fetch(`${API_URL}/products`);
        const products = await res.json();
        await loadCategoriesForSelect(); 

        const tbody = document.getElementById("productsTable");
        tbody.innerHTML = products.map(p => `
            <tr>
                <td>
                    <img src="${p.image}" alt="${p.name}"
                         style="width:50px; height:50px; object-fit:cover; border-radius:5px; border: 1px solid #ddd;"
                         onerror="this.src='https://placehold.co/50x50?text=Sin+Foto'">
                </td>
                <td><strong>${p.name}</strong></td>
                <td><span class="badge badge-info">${p.category}</span></td>
                <td>Bs ${p.price.toFixed(2)}</td>
                <td>${p.views || 0}</td>
                <td>
                    <button class="btn-icon" style="color:red;" onclick="deleteProduct(${p.id}, '${p.name}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>`).join('');
    } catch (e) {
        console.error(e);
        notify("Error", "No se pudieron cargar los productos", "error");
    } finally {
        toggleLoading(false);
    }
}

// --- FUNCIÓN ACTUALIZADA PARA ENVIAR IMÁGENES ---
async function saveProduct() {
    const name = document.getElementById("productName").value;
    const price = document.getElementById("productPrice").value;
    const catSelect = document.getElementById("productCategory");
    const categoryName = catSelect.options[catSelect.selectedIndex]?.text || "General";
    const description = document.getElementById("productDescription").value;
    const fileInput = document.getElementById("productPhotos"); // Input de archivo

    if (!name || !price) return notify("Atención", "Nombre y Precio son obligatorios", "warning");

    // Usamos FormData para enviar archivos
    const formData = new FormData();
    formData.append('name', name);
    formData.append('price', price);
    formData.append('category', categoryName);
    formData.append('description', description);

    // Si seleccionó una foto, la agregamos
    if (fileInput.files.length > 0) {
        formData.append('image', fileInput.files[0]);
    }

    toggleLoading(true);
    try {
        const res = await fetch(`${API_URL}/products`, {
            method: "POST",
            // NO establecemos Content-Type header manualmente, fetch lo hace automático para FormData
            body: formData 
        });

        const data = await res.json();

        if (res.ok && data.success) {
            notify("Éxito", "Producto guardado correctamente", "success");
            closeProductModal();
            loadProducts();
        } else {
            notify("Error", "No se pudo guardar", "error");
        }
    } catch (e) { 
        console.error(e);
        notify("Error", "Fallo de conexión", "error"); 
    }
    finally { toggleLoading(false); }
}

async function deleteProduct(id, name) {
    const result = await Swal.fire({
        title: `¿Eliminar "${name}"?`,
        text: "No podrás recuperar este producto.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        try {
            await fetch(`${API_URL}/products/${id}`, { method: "DELETE" });
            notify("Eliminado", "El producto ha sido borrado.", "success");
            loadProducts();
        } catch(e) { notify("Error", "No se pudo eliminar", "error"); }
    }
}

// =========================
// 3. GESTIÓN DE CATEGORÍAS
// =========================
async function loadCategories() {
    try {
        const res = await fetch(`${API_URL}/categories`);
        const cats = await res.json();
        categoriesList = cats;

        const tbody = document.getElementById("categoriesTable");
        tbody.innerHTML = cats.map(c => `
            <tr>
                <td><strong>${c.name}</strong></td>
                <td>${c.description}</td>
                <td>
                    <span style="background:#e3f2fd; color:#0d47a1; padding:4px 8px; border-radius:4px; font-size:0.9em;">
                        ${c.stock} productos
                    </span>
                </td>
                <td>
                    <button class="btn-icon" style="color:red;" onclick="deleteCategory(${c.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch(e) { console.error(e); }
}

async function loadCategoriesForSelect() {
    const res = await fetch(`${API_URL}/categories`);
    const cats = await res.json();
    const select = document.getElementById("productCategory");
    
    select.innerHTML = '<option value="">Seleccione una categoría...</option>';
    cats.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        select.appendChild(opt);
    });
}

async function saveCategory() {
    const name = document.getElementById("catName").value;
    const desc = document.getElementById("catDesc").value;

    if (!name) return notify("Error", "El nombre es obligatorio", "warning");

    const res = await fetch(`${API_URL}/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name, description: desc })
    });

    if (res.ok) {
        notify("Éxito", "Categoría creada", "success");
        closeCategoryModal();
        loadCategories();
    }
}

async function deleteCategory(id) {
    if(confirm("¿Seguro que deseas borrar esta categoría?")) {
        await fetch(`${API_URL}/categories/${id}`, { method: "DELETE" });
        loadCategories();
    }
}

// =========================
// 4. DASHBOARD Y UTILIDADES
// =========================
async function loadDashboardStats() {
    try {
        const res = await fetch(`${API_URL}/orders/stats`);
        const stats = await res.json();
        document.getElementById("totalRevenue").textContent = `Bs. ${stats.total_revenue}`;
        document.getElementById("totalSales").textContent = stats.total_sales_count;
        document.getElementById("failedPayments").textContent = stats.failed_payments;
        initChart([100, 200, 150, 300, 250, 400, 350]);
    } catch(e) {}
}

async function loadOrdersTable() {
    try {
        const res = await fetch(`${API_URL}/orders`);
        const orders = await res.json();
        document.getElementById("ordersTableBody").innerHTML = orders.map(o => `
            <tr>
                <td>${o.order_number}</td>
                <td>${o.customer.name}</td>
                <td>Bs ${o.total}</td>
                <td><span class="badge badge-success">${o.status}</span></td>
                <td>${o.date}</td>
                <td><button class="btn-icon"><i class="fas fa-eye"></i></button></td>
            </tr>
        `).join('');
    } catch(e) {}
}

function showProductForm() {
    document.getElementById("productForm").reset();
    document.getElementById("productModal").style.display = "flex";
    loadCategoriesForSelect();
}
function showCategoryForm() {
    document.getElementById("categoryForm").reset();
    document.getElementById("categoryModal").style.display = "flex";
}
function closeProductModal() { document.getElementById("productModal").style.display = "none"; }
function closeCategoryModal() { document.getElementById("categoryModal").style.display = "none"; }

function toggleLoading(show) { 
    const loader = document.getElementById("loadingOverlay");
    if(loader) loader.style.display = show ? "block" : "none";
}

function notify(title, text, icon) {
    Swal.fire({ title, text, icon, toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
}

function initChart(data) {
    const ctx = document.getElementById('salesChart');
    if(!ctx) return;
    if(window.myChart) window.myChart.destroy();
    window.myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
            datasets: [{
                label: 'Ventas Semanales',
                data: data,
                borderColor: '#d4af37',
                backgroundColor: 'rgba(212, 175, 55, 0.1)',
                fill: true
            }]
        }
    });
}