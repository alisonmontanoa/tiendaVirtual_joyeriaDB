const API_URL = "http://127.0.0.1:5000";

// =========================
// CARGAR LISTA DE PRODUCTOS
// =========================
function cargarProductos() {
    fetch(`${API_URL}/products`)
        .then(res => res.json())
        .then(productos => {
            let html = "";
            productos.forEach(p => {
                html += `
                    <p>
                        <strong>${p.name}</strong> - ${p.price} Bs  
                        <button onclick="editarProducto('${p._id}')">Editar</button>
                        <button onclick="eliminarProducto('${p._id}')">Eliminar</button>
                    </p>
                `;
            });
            document.getElementById("listaProductos").innerHTML = html;
        });
}

cargarProductos();

// =========================
// CREAR PRODUCTO
// =========================
function crearProducto() {
    const data = {
        name: document.getElementById("name").value,
        price: parseFloat(document.getElementById("price").value),
        description: document.getElementById("description").value,
        category_id: document.getElementById("category_id").value
    };

    fetch(`${API_URL}/products`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(data)
    })
    .then(() => {
        alert("Producto creado");
        cargarProductos();
    });
}

// =========================
// EDITAR PRODUCTO
// =========================
function editarProducto(id) {
    const nuevoNombre = prompt("Ingrese nuevo nombre:");

    if (!nuevoNombre) return;

    fetch(`${API_URL}/products/${id}`, {
        method: "PUT",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ name: nuevoNombre })
    })
    .then(() => {
        alert("Producto actualizado");
        cargarProductos();
    });
}

// =========================
// ELIMINAR PRODUCTO
// =========================
function eliminarProducto(id) {
    if (!confirm("¿Desea eliminar este producto?")) return;

    fetch(`${API_URL}/products/${id}`, {
        method: "DELETE"
    })
    .then(() => {
        alert("Producto eliminado");
        cargarProductos();
    });
}
