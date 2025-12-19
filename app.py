from flask import Flask, render_template, send_from_directory, jsonify, request
from flask_cors import CORS
from werkzeug.utils import secure_filename # Importante para guardar archivos
import time
import os

app = Flask(__name__, 
            template_folder="templates", 
            static_folder="static",
            static_url_path="/static")

app.secret_key = 'clave_secreta_para_carrito'
CORS(app)

# ==========================================
#  BASE DE DATOS (Categorías y Productos)
# ==========================================

# 1. CATEGORÍAS
categories_db = [
    {"id": 1, "name": "Anillos", "description": "Anillos de oro y plata"},
    {"id": 2, "name": "Collares", "description": "Cadenas y colgantes"},
    {"id": 3, "name": "Aretes", "description": "Aretes y pendientes"},
    {"id": 4, "name": "Manillas", "description": "Pulseras y brazaletes"}
]

# 2. PRODUCTOS
products_db = [
    {"id": 1, "name": "Anillo de Lujo", "price": 500.00, "image": "/static/images/products/anillo.avif", "category": "Anillos", "views": 120},
    {"id": 2, "name": "Collar de Perlas", "price": 600.00, "image": "/static/images/products/collar.png", "category": "Collares", "views": 85},
    {"id": 3, "name": "Aretes Esmeralda", "price": 1000.00, "image": "/static/images/products/aretes.jpg", "category": "Aretes", "views": 45},
    {"id": 4, "name": "Conjunto Perlas", "price": 1200.00, "image": "/static/images/products/perlas.jpeg", "category": "Collares", "views": 30}
]

carts_storage = {}
orders_db = []

# ==========================================
#  RUTAS API: CATEGORÍAS Y PRODUCTOS
# ==========================================

@app.route('/api/categories', methods=['GET'])
def get_categories():
    categories_with_stock = []
    for cat in categories_db:
        count = sum(1 for p in products_db if p.get('category') == cat['name'])
        new_cat = cat.copy()
        new_cat['stock'] = count
        categories_with_stock.append(new_cat)
    return jsonify(categories_with_stock)

@app.route('/api/categories', methods=['POST'])
def add_category():
    data = request.json
    new_cat = {
        "id": len(categories_db) + 1,
        "name": data.get("name"),
        "description": data.get("description", "")
    }
    categories_db.append(new_cat)
    return jsonify({"success": True})

@app.route('/api/categories/<int:cat_id>', methods=['DELETE'])
def delete_category(cat_id):
    global categories_db
    categories_db = [c for c in categories_db if c['id'] != cat_id]
    return jsonify({"success": True})

@app.route('/api/products', methods=['GET'])
def get_products_fix():
    return jsonify(products_db)

# --- ESTA ES LA FUNCIÓN ACTUALIZADA PARA IMÁGENES ---
@app.route('/api/products', methods=['POST'])
def add_product():
    # Usamos try/except para capturar errores de subida
    try:
        # Obtenemos datos del formulario (ya no es JSON puro)
        name = request.form.get('name')
        price = float(request.form.get('price'))
        category = request.form.get('category')
        description = request.form.get('description', '')
        
        # Imagen por defecto
        image_url = "/static/images/products/anillo.avif"
        
        # Procesar archivo de imagen si existe
        if 'image' in request.files:
            file = request.files['image']
            if file.filename != '':
                # Crear nombre único para evitar conflictos
                filename = secure_filename(file.filename)
                unique_name = f"{int(time.time())}_{filename}"
                
                # Asegurar que la carpeta existe
                save_folder = os.path.join(app.static_folder, 'images', 'products')
                if not os.path.exists(save_folder):
                    os.makedirs(save_folder)
                
                # Guardar archivo
                file.save(os.path.join(save_folder, unique_name))
                image_url = f"/static/images/products/{unique_name}"

        new_id = len(products_db) + 1
        new_product = {
            "id": new_id,
            "name": name,
            "price": price,
            "image": image_url, # Guardamos la ruta de la imagen subida
            "category": category,
            "description": description,
            "views": 0
        }
        products_db.append(new_product)
        return jsonify({"success": True, "product": new_product})
        
    except Exception as e:
        print(f"Error al guardar producto: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/products/<int:product_id>', methods=['DELETE'])
def delete_product(product_id):
    global products_db
    products_db = [p for p in products_db if p['id'] != product_id]
    return jsonify({"success": True, "message": "Producto eliminado"})

# ==========================================
#  RUTAS API: CARRITO
# ==========================================

@app.route('/api/carts/<cart_id>', methods=['GET'])
def get_cart(cart_id):
    cart = carts_storage.get(cart_id, {"items": []})
    return jsonify(cart)

@app.route('/api/carts/<cart_id>/add', methods=['POST'])
def add_to_cart(cart_id):
    data = request.json
    try:
        product_id = int(data.get('product_id'))
    except:
        return jsonify({"success": False, "error": "ID inválido"}), 400
    
    if cart_id not in carts_storage:
        carts_storage[cart_id] = {"items": []}
    
    found = False
    for item in carts_storage[cart_id]["items"]:
        if item["product_id"] == product_id:
            item["quantity"] += 1
            found = True
            break
    
    if not found:
        product_info = next((p for p in products_db if p["id"] == product_id), None)
        if product_info:
            new_item = {
                "product_id": product_info["id"],
                "name": product_info["name"],
                "price": product_info["price"],
                "quantity": 1,
                "image": product_info["image"]
            }
            carts_storage[cart_id]["items"].append(new_item)
    
    return jsonify(carts_storage[cart_id])

@app.route('/api/carts/<cart_id>/remove', methods=['POST'])
def remove_from_cart(cart_id):
    data = request.json
    product_id_to_remove = int(data.get('product_id'))
    if cart_id in carts_storage:
        carts_storage[cart_id]["items"] = [
            item for item in carts_storage[cart_id]["items"] 
            if item["product_id"] != product_id_to_remove
        ]
        return jsonify({"success": True, "cart": carts_storage[cart_id]})
    return jsonify({"success": False, "error": "Carrito no encontrado"}), 404

# ==========================================
#  OTRAS RUTAS
# ==========================================

@app.route('/api/orders/stats', methods=['GET'])
def get_stats():
    return jsonify({"total_revenue": 3500, "total_sales_count": 12, "failed_payments": 2})

@app.route('/api/orders', methods=['GET'])
def get_orders():
    return jsonify(orders_db)

@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.json
    if (data.get('username') == 'admin' or data.get('username') == 'alison') and data.get('password') == '123':
        return jsonify({"success": True})
    return jsonify({"success": False}), 401

@app.route('/')
def user_panel(): return render_template("user.html")
@app.route('/carrito')
def carrito_page(): return render_template("carrito.html")
@app.route('/productos')
def productos_page(): return render_template("productos.html")
@app.route('/contacto')
def contacto_page(): return render_template("contacto.html")
@app.route('/admin')
def admin_panel(): return render_template("admin.html")
@app.route('/login')
def login_page(): return render_template("login.html")

@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory('static', filename)

if __name__ == '__main__':
    # Crear carpetas necesarias
    images_path = os.path.join(app.static_folder, 'images', 'products')
    if not os.path.exists(images_path):
        os.makedirs(images_path)
    print("--- SERVIDOR CORRIENDO EN PUERTO 5000 ---")
    app.run(debug=True, port=5000)