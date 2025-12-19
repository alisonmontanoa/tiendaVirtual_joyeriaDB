from flask import Flask, render_template, send_from_directory, jsonify, request
from flask_cors import CORS
import os

app = Flask(__name__, 
            template_folder="templates", 
            static_folder="static",
            static_url_path="/static")

app.secret_key = 'clave_secreta_para_carrito'
CORS(app)

# ==========================================
#  BASE DE DATOS SIMULADA
# ==========================================

products_db = [
    {
        "id": 1, 
        "name": "Anillo de Lujo", 
        "price": 500.00, 
        "image": "/static/images/products/anillo.avif", 
        "category": "joyas"
    },
    {
        "id": 2, 
        "name": "Collar de Perlas", 
        "price": 600.00, 
        "image": "/static/images/products/collar.png", 
        "category": "joyas"
    },
    {
        "id": 3, 
        "name": "Aretes Esmeralda", 
        "price": 1000.00, 
        "image": "/static/images/products/aretes.jpg", 
        "category": "joyas"
    },
    {
        "id": 4, 
        "name": "Conjunto Perlas", 
        "price": 1200.00, 
        "image": "/static/images/products/perlas.jpeg", 
        "category": "joyas"
    }
]

# Almacén de carritos en memoria
carts_storage = {}

# ==========================================
#  RUTAS API (BACKEND)
# ==========================================

# --- 1. GESTIÓN DE PRODUCTOS (Para Tienda y Admin) ---

@app.route('/api/products', methods=['GET'])
def get_products_fix():
    return jsonify(products_db)

# NUEVO: Ruta para AGREGAR productos desde el Admin
@app.route('/api/products', methods=['POST'])
def add_product():
    data = request.json
    new_id = len(products_db) + 1
    new_product = {
        "id": new_id,
        "name": data.get("name", "Nuevo Producto"),
        "price": float(data.get("price", 0)),
        "image": data.get("image", "/static/images/products/anillo.avif"), # Imagen por defecto
        "category": data.get("category", "joyas")
    }
    products_db.append(new_product)
    return jsonify({"success": True, "product": new_product})

# NUEVO: Ruta para ELIMINAR productos desde el Admin
@app.route('/api/products/<int:product_id>', methods=['DELETE'])
def delete_product(product_id):
    global products_db
    products_db = [p for p in products_db if p['id'] != product_id]
    return jsonify({"success": True, "message": "Producto eliminado"})


# --- 2. GESTIÓN DEL CARRITO ---

@app.route('/api/carts/<cart_id>', methods=['GET'])
def get_cart_fix(cart_id):
    cart = carts_storage.get(cart_id, {"items": []})
    return jsonify(cart)

@app.route('/api/carts/<cart_id>/add', methods=['POST'])
def add_to_cart_fix(cart_id):
    data = request.json
    if cart_id not in carts_storage:
        carts_storage[cart_id] = {"items": []}
    
    found = False
    for item in carts_storage[cart_id]["items"]:
        if item["product_id"] == data["product_id"]:
            item["quantity"] += 1
            found = True
            break
    
    if not found:
        product_info = next((p for p in products_db if p["id"] == data["product_id"]), None)
        if product_info:
            new_item = {
                "product_id": data["product_id"],
                "name": product_info["name"],
                "price": product_info["price"],
                "quantity": 1,
                "image": product_info["image"]
            }
            carts_storage[cart_id]["items"].append(new_item)
    return jsonify(carts_storage[cart_id])

@app.route('/api/carts/<cart_id>/remove', methods=['POST'])
def remove_from_cart_fix(cart_id):
    data = request.json
    product_id_to_remove = data.get('product_id')
    if cart_id in carts_storage:
        carts_storage[cart_id]["items"] = [
            item for item in carts_storage[cart_id]["items"] 
            if item["product_id"] != product_id_to_remove
        ]
        return jsonify({"success": True, "cart": carts_storage[cart_id]})
    return jsonify({"success": False, "error": "Carrito no encontrado"}), 404


# --- 3. AUTENTICACIÓN (LOGIN) ---

# NUEVO: Ruta para verificar usuario y contraseña
@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    # CREDENCIALES FIJAS (Puedes cambiarlas aquí)
    # Aceptamos 'admin' o 'alison' como usuario
    if (username == 'admin' or username == 'alison') and password == '123':
        return jsonify({"success": True, "message": "Login exitoso"})
    
    return jsonify({"success": False, "message": "Credenciales incorrectas"}), 401


# ==========================================
#  RUTAS DE PÁGINAS WEB (FRONTEND)
# ==========================================

@app.route('/')
def user_panel(): return render_template("user.html")

@app.route('/carrito')
def carrito_page(): return render_template("carrito.html")

@app.route('/productos')
def productos_page(): return render_template("productos.html")

@app.route('/contacto')
def contacto_page(): return render_template("contacto.html")

@app.route('/admin')
def admin_panel():
    return render_template("admin.html")

@app.route('/login')
def login_page():
    return render_template("login.html")

# Servir archivos estáticos
@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory('static', filename)

if __name__ == '__main__':
    print("--- SERVIDOR LISTO EN PUERTO 5000 ---")
    app.run(debug=True, port=5000)