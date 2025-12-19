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

# --- RUTAS API (BACKEND) ---

@app.route('/api/products', methods=['GET'])
def get_products_fix():
    return jsonify(products_db)

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

# --- RUTAS DE PÁGINAS WEB (FRONTEND) ---

@app.route('/')
def user_panel(): return render_template("user.html")

@app.route('/carrito')
def carrito_page(): return render_template("carrito.html")

@app.route('/productos')
def productos_page(): return render_template("productos.html")

@app.route('/contacto')
def contacto_page(): return render_template("contacto.html")

# --- ¡AQUÍ ESTABAN FALTANDO ESTAS RUTAS! ---
@app.route('/admin')
def admin_panel():
    return render_template("admin.html")

@app.route('/login')
def login_page():
    return render_template("login.html")
# -------------------------------------------

# Servir archivos estáticos por si acaso
@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory('static', filename)

if __name__ == '__main__':
    print("--- SERVIDOR LISTO EN PUERTO 5000 ---")
    app.run(debug=True, port=5000)