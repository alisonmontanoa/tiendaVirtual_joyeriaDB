from flask import Flask, render_template, send_from_directory, jsonify, request, session
from flask_cors import CORS
import os

app = Flask(__name__, 
            template_folder="templates", 
            static_folder="static",
            static_url_path="/static")

app.secret_key = 'clave_secreta_para_carrito'
CORS(app)

# --- BLUEPRINTS COMENTADOS (Para evitar conflictos y errores 404) ---
# from routes.products import products_bp
# from routes.categories import categories_bp
# from routes.carts import carts_bp
# from routes.orders import orders_bp
# from routes.users import users_bp

# app.register_blueprint(products_bp, url_prefix="/api")
# app.register_blueprint(categories_bp, url_prefix="/api")
# app.register_blueprint(orders_bp, url_prefix="/api")
# app.register_blueprint(carts_bp, url_prefix="/api")
# app.register_blueprint(users_bp, url_prefix="/api")

# ==========================================
#  BASE DE DATOS Y RUTAS MANUALES
# ==========================================

# IMPORTANTE: Asegúrate de que estos archivos existan en static/images/products/
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

# --- RUTA PARA PRODUCTOS (Soluciona el error 404) ---
@app.route('/api/products', methods=['GET'])
def get_products_fix():
    print("¡Solicitud recibida en /api/products!") 
    return jsonify(products_db)

# --- RUTAS PARA EL CARRITO ---
@app.route('/api/carts/<cart_id>', methods=['GET'])
def get_cart_fix(cart_id):
    cart = carts_storage.get(cart_id, {"items": []})
    return jsonify(cart)

@app.route('/api/carts/<cart_id>/add', methods=['POST'])
def add_to_cart_fix(cart_id):
    data = request.json
    if cart_id not in carts_storage:
        carts_storage[cart_id] = {"items": []}
    
    # Buscar si ya existe para sumar cantidad
    found = False
    for item in carts_storage[cart_id]["items"]:
        if item["product_id"] == data["product_id"]:
            item["quantity"] += 1
            found = True
            break
    
    # Si es nuevo, lo agregamos
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
        # Recreamos la lista EXCLUYENDO el producto que queremos borrar
        original_count = len(carts_storage[cart_id]["items"])
        carts_storage[cart_id]["items"] = [
            item for item in carts_storage[cart_id]["items"] 
            if item["product_id"] != product_id_to_remove
        ]
        
        if len(carts_storage[cart_id]["items"]) < original_count:
             return jsonify({"success": True, "message": "Producto eliminado", "cart": carts_storage[cart_id]})
        else:
             return jsonify({"success": False, "message": "Producto no encontrado en el carrito"})

    return jsonify({"success": False, "error": "Carrito no encontrado"}), 404

# --- RUTAS DE PÁGINAS WEB ---
@app.route('/')
def user_panel(): return render_template("user.html")

@app.route('/carrito')
def carrito_page(): return render_template("carrito.html")

@app.route('/productos')
def productos_page(): return render_template("productos.html")

# Sirve las imágenes y archivos estáticos
@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory('static', filename)

if __name__ == '__main__':
    # Crear carpetas si no existen
    folders = ['static/images/products']
    for folder in folders:
        if not os.path.exists(folder):
            try:
                os.makedirs(folder)
            except:
                pass
            
    print("--- SERVIDOR INICIADO EN PUERTO 5000 ---")
    app.run(debug=True, port=5000)