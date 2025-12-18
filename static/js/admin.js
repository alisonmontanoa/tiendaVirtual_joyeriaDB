const API_URL = "http://localhost:5000/api";
let currentCharts = {};

(function comprobarAcceso() {
    if (localStorage.getItem('admin_logueado') !== 'si') {
        // Si no has iniciado sesión, te expulsa al login
        window.location.href = '/login';
    }
})();

// =========================
// 1. NAVEGACIÓN Y DASHBOARD
// =========================
function showSection(sectionId) {
    document.querySelectorAll(".section-content").forEach(sec => sec.style.display = "none");
    document.querySelectorAll(".admin-menu a").forEach(a => a.classList.remove("active"));

    document.getElementById(sectionId).style.display = "block";
    document.querySelector(`a[href="#${sectionId}"]`).classList.add("active");

    const titleMap = {
        'dashboard': 'Dashboard de Ventas',
        'products': 'Gestión de Inventario',
        'categories': 'Categorías',
        'orders': 'Control de Órdenes'
    };
    document.getElementById("sectionTitle").textContent = titleMap[sectionId];

    const addBtn = document.getElementById("globalAddBtn");
    if (sectionId === 'products' || sectionId === 'categories') {
        addBtn.style.display = "block";
        document.getElementById("addBtnText").textContent = sectionId === 'products' ? "Nuevo Producto" : "Nueva Categoría";
    } else {
        addBtn.style.display = "none";
    }

    if (sectionId === "dashboard") loadDashboardStats();
    if (sectionId === "products") loadProducts();
    if (sectionId === "categories") loadCategories();
    if (sectionId === "orders") loadOrdersTable();
}

async function loadDashboardStats() {
    try {
        const res = await fetch(`${API_URL}/orders/stats`);
        const stats = await res.json();
        document.getElementById("totalRevenue").textContent = `Bs. ${stats.total_revenue.toLocaleString()}`;
        document.getElementById("totalSales").textContent = stats.total_sales_count;
        document.getElementById("failedPayments").textContent = stats.failed_payments;
        initCharts();
    } catch (err) { console.error("Error stats:", err); }
}

function initCharts() {
    const ctx = document.getElementById('salesChart').getContext('2d');
    if (currentCharts['sales']) currentCharts['sales'].destroy();

    currentCharts['sales'] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
            datasets: [{
                label: 'Ventas (Bs)',
                data: [150, 230, 180, 320, 290, 450, 400], 
                borderColor: '#d4af37',
                backgroundColor: 'rgba(212, 175, 55, 0.1)',
                fill: true
            }]
        },
        options: { responsive: true }
    });
}

// =========================
// 2. GESTIÓN DE PRODUCTOS
// =========================
async function loadProducts() {
    toggleLoading(true);
    try {
        const res = await fetch(`${API_URL}/products`);
        const products = await res.json();
        const tbody = document.getElementById("productsTable");
        
        tbody.innerHTML = products.map(p => {
            // Lógica para imagen principal
            let imgUrl = 'https://placehold.co/50x50?text=Sin+Foto'; 
            if (p.photos && p.photos.length > 0) {
                imgUrl = p.photos[0];
            }

            return `
            <tr>
                <td>
                    <img src="${imgUrl}" 
                         alt="${p.name}"
                         style="width:50px; height:50px; object-fit:cover; border-radius:5px; border: 1px solid #ddd;"
                         onerror="this.onerror=null;this.src='https://placehold.co/50x50?text=Error';">
                </td>
                <td><strong>${p.name}</strong></td>
                <td><span class="badge">${p.category || 'General'}</span></td>
                <td>Bs ${p.price}</td>
                <td>${p.views || 0}</td>
                <td>
                    <button class="btn-icon" style="color:red;" onclick="deleteProduct('${p._id}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
        }).join('');
    } catch (e) { 
        notify("Error", "Fallo al cargar productos", "error"); 
    } finally { 
        toggleLoading(false); 
    }
}

async function saveProduct() {
    const name = document.getElementById("productName").value;
    const price = document.getElementById("productPrice").value;
    const cat = document.getElementById("productCategory").value;
    const charInput = document.getElementById("productCharacteristics").value;

    if (!name || !price || !cat) return notify("Error", "Complete los campos obligatorios", "warning");

    // Lógica flexible para características (JSON o Texto)
    let characteristics = {};
    if (charInput.trim().startsWith("{")) {
        try { characteristics = JSON.parse(charInput); } 
        catch (e) { return notify("Error JSON", "Formato inválido", "error"); }
    } else {
        characteristics = { "detalle": charInput };
    }

    const formData = new FormData();
    formData.append("name", name);
    formData.append("price", price);
    formData.append("category_id", cat);
    formData.append("description", document.getElementById("productDescription").value);
    formData.append("characteristics", JSON.stringify(characteristics));

    const photos = document.getElementById("productPhotos").files;
    for (let i = 0; i < photos.length; i++) {
        formData.append("photos", photos[i]);
    }

    toggleLoading(true);
    try {
        const res = await fetch(`${API_URL}/products`, { method: "POST", body: formData });
        if (res.ok) {
            notify("Éxito", "Producto guardado", "success");
            closeProductModal();
            loadProducts();
        } else {
            const data = await res.json();
            notify("Error", data.error || "No se pudo guardar", "error");
        }
    } catch (e) { notify("Error", "Fallo de conexión", "error"); }
    finally { toggleLoading(false); }
}

async function deleteProduct(id) {
    const result = await Swal.fire({
        title: '¿Eliminar?',
        text: "Se borrará permanentemente",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Sí, borrar'
    });

    if (result.isConfirmed) {
        await fetch(`${API_URL}/products/${id}`, { method: "DELETE" });
        notify("Eliminado", "Producto borrado", "success");
        loadProducts();
    }
}

// =========================
// 3. GESTIÓN DE CATEGORÍAS
// =========================
async function loadCategories() {
    const res = await fetch(`${API_URL}/categories`);
    const cats = await res.json();
    document.getElementById("categoriesTable").innerHTML = cats.map(c => `
        <tr>
            <td><strong>${c.name}</strong></td>
            <td>${c.description}</td>
            <td><button class="btn-icon" style="color:red;" onclick="deleteCategory('${c._id}')"><i class="fas fa-trash"></i></button></td>
        </tr>
    `).join('');
}

async function saveCategory() {
    const name = document.getElementById("catName").value;
    const desc = document.getElementById("catDesc").value;
    if (!name) return notify("Error", "Nombre obligatorio", "warning");

    const res = await fetch(`${API_URL}/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name, description: desc })
    });
    
    if (res.ok) {
        notify("Éxito", "Categoría creada", "success");
        closeCategoryModal();
        loadCategories();
    } else {
        notify("Error", "Error al crear", "error");
    }
}

async function deleteCategory(id) {
    const res = await fetch(`${API_URL}/categories/${id}`, { method: "DELETE" });
    if (res.ok) {
        notify("Eliminado", "Categoría borrada", "success");
        loadCategories();
    } else {
        const data = await res.json();
        notify("Error", data.error, "error");
    }
}

async function loadCategoriesForSelect() {
    const res = await fetch(`${API_URL}/categories`);
    const cats = await res.json();
    const select = document.getElementById("productCategory");
    select.innerHTML = '<option value="">Seleccione...</option>' + 
        cats.map(c => `<option value="${c._id}">${c.name}</option>`).join('');
}

// =========================
// 4. GESTIÓN DE ÓRDENES
// =========================
async function loadOrdersTable() {
    try {
        const res = await fetch(`${API_URL}/orders`);
        const orders = await res.json();
        const tbody = document.getElementById("ordersTableBody");
        tbody.innerHTML = orders.map(o => {
            let badgeClass = o.status === 'completed' ? 'success' : (o.status === 'payment_failed' ? 'danger' : 'warning');
            return `
            <tr>
                <td><small>${o.order_number}</small></td>
                <td>${o.customer ? o.customer.name : 'Anónimo'}</td>
                <td>Bs ${o.total.toFixed(2)}</td>
                <td><span class="badge badge-${badgeClass}" style="padding:5px 10px; border-radius:15px; color:white; background-color:${badgeClass==='success'?'#28a745': badgeClass==='danger'?'#dc3545':'#ffc107'}">${o.status}</span></td>
                <td>${o.date_formatted || new Date(o.date).toLocaleDateString()}</td>
                <td><button class="btn-icon" onclick="viewOrderDetails('${o._id}')"><i class="fas fa-eye"></i></button></td>
            </tr>`;
        }).join('');
    } catch (e) { console.error(e); }
}

async function viewOrderDetails(id) {
    const res = await fetch(`${API_URL}/orders/${id}`);
    const o = await res.json();
    const itemsHtml = o.items.map(i => `<li>${i.quantity}x <b>${i.name}</b> - Bs ${(i.price * i.quantity).toFixed(2)}</li>`).join('');
    Swal.fire({
        title: `Orden ${o.order_number}`,
        html: `<div style="text-align:left"><p>Cliente: ${o.customer.name}</p><hr><ul>${itemsHtml}</ul><hr><h3 style="text-align:right">Total: Bs ${o.total.toFixed(2)}</h3></div>`
    });
}

// =========================
// 5. UTILIDADES
// =========================
function handleGlobalAdd() {
    const active = document.querySelector(".section-content:not([style*='display: none'])").id;
    if (active === 'products') showProductForm();
    if (active === 'categories') showCategoryForm();
}

function showProductForm() {
    document.getElementById("productForm").reset();
    document.getElementById("photoPreview").innerHTML = "";
    document.getElementById("productModal").style.display = "flex";
    loadCategoriesForSelect();
}
function showCategoryForm() {
    document.getElementById("categoryForm").reset();
    document.getElementById("categoryModal").style.display = "flex";
}
function closeProductModal() { document.getElementById("productModal").style.display = "none"; }
function closeCategoryModal() { document.getElementById("categoryModal").style.display = "none"; }

function previewImages() {
    const preview = document.getElementById("photoPreview");
    preview.innerHTML = "";
    Array.from(document.getElementById("productPhotos").files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.innerHTML += `<img src="${e.target.result}" style="width:50px; height:50px; object-fit:cover; border-radius:4px;">`;
        };
        reader.readAsDataURL(file);
    });
}
function cerrarSesion() {
    localStorage.removeItem('admin_logueado'); // Borra el permiso
    window.location.href = '/login'; // Te manda al login
}

// Función para cerrar sesión
function logout() {
    // 1. Borramos la "llave" de acceso del navegador
    localStorage.clear(); 
    
    // 2. Te enviamos de vuelta a la puerta de entrada
    window.location.href = '/login';
}

function toggleLoading(show) { document.getElementById("loadingOverlay").style.display = show ? "block" : "none"; }
function notify(title, text, icon) { Swal.fire({ title, text, icon, toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 }); }

window.onload = () => showSection('dashboard');