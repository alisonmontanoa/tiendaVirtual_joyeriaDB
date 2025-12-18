from flask import Blueprint, request, jsonify
from bson import ObjectId
from datetime import datetime
from werkzeug.utils import secure_filename
import os
import json
from database import db  

products_bp = Blueprint("products", __name__)

# ==========================================
# CONFIGURACIÓN DE CARPETA DE IMÁGENES
# ==========================================
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'static', 'images', 'products')

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp", "avif"}

# Crear la carpeta automáticamente si no existe
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

# Obtener colecciones
products = db.get_collection("products")
categories = db.get_collection("categories")

# ============================
#   CREAR PRODUCTO (POST)
# ============================
@products_bp.route("/products", methods=["POST"])
def create_product():
    try:
        data = request.form
        
        # Procesar características
        char_raw = data.get("characteristics", "{}")
        try:
            characteristics_dict = json.loads(char_raw)
        except:
            characteristics_dict = {"detalle": char_raw}

        # Procesar Imágenes
        photos_list = []
        if "photos" in request.files:
            files = request.files.getlist("photos")
            for file in files:
                if file and allowed_file(file.filename):
                    filename = secure_filename(file.filename)
                    timestamp = int(datetime.now().timestamp())
                    new_filename = f"{timestamp}_{filename}"
                    save_path = os.path.join(UPLOAD_FOLDER, new_filename)
                    file.save(save_path)
                    web_url = f"/static/images/products/{new_filename}"
                    photos_list.append(web_url)

        # Crear nuevo producto
        new_product = {
            "name": data.get("name"),
            "description": data.get("description", ""),
            "price": float(data.get("price", 0)),
            "category_id": ObjectId(data.get("category_id")),  # Asegúrate de convertir el ID de categoría en ObjectId
            "type": data.get("type", "joya"),
            "photos": photos_list,
            "characteristics": characteristics_dict,
            "views": 0,
            "purchases": 0,
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }

        product_id = products.insert_one(new_product).inserted_id
        return jsonify({"message": "Product created", "id": str(product_id)}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 400

# ============================
#   OBTENER TODOS (GET)
# ============================
@products_bp.route("/products", methods=["GET"])
def get_products():
    try:
        category_id = request.args.get('category')  # Obtiene el id de la categoría de la query string
        query = {}

        if category_id:
            query["category_id"] = ObjectId(category_id)  # Filtrar por categoría

        result = []
        for prod in products.find(query).sort("created_at", -1):
            prod["_id"] = str(prod["_id"])

            if "category_id" in prod and isinstance(prod["category_id"], ObjectId):
                prod["category_id"] = str(prod["category_id"])
                
            result.append(prod)

        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ============================
#   ACTUALIZAR PRODUCTO (PUT)
# ============================
@products_bp.route("/products/<id>", methods=["PUT"])
def update_product(id):
    try:
        product = products.find_one({"_id": ObjectId(id)})
        if not product:
            return jsonify({"error": "Product not found"}), 404

        data = request.form
        updated_photos = product.get("photos", [])

        # Si se envían nuevas fotos, reemplazamos las anteriores
        if "photos" in request.files:
            new_photos = request.files.getlist("photos")
            updated_photos = []  # Si hay nuevas fotos, las reemplazamos por completo
            for file in new_photos:
                if file and allowed_file(file.filename):
                    filename = secure_filename(file.filename)
                    file.save(os.path.join(UPLOAD_FOLDER, filename))
                    updated_photos.append(f"/static/images/products/{filename}")

        char_raw = data.get("characteristics")
        
        cat_id = data.get("category_id")
        updated_fields = {
            "name": data.get("name", product["name"]),
            "description": data.get("description", product.get("description", "")),
            "price": float(data.get("price", product["price"])),
            "category_id": ObjectId(cat_id) if cat_id else product.get("category_id"),
            "type": data.get("type", product.get("type", "joya")),
            "photos": updated_photos,
            "updated_at": datetime.now()
        }
        
        if char_raw:
            try:
                updated_fields["characteristics"] = json.loads(char_raw)
            except:
                updated_fields["characteristics"] = {"detalle": char_raw}

        products.update_one({"_id": ObjectId(id)}, {"$set": updated_fields})
        return jsonify({"message": "Product updated"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# ============================
#   ELIMINAR PRODUCTO
# ============================
@products_bp.route("/products/<id>", methods=["DELETE"])
def delete_product(id):
    try:
        # 1. Buscar el producto para borrar sus fotos físicamente
        product = products.find_one({"_id": ObjectId(id)})
        if product and "photos" in product:
            for photo_url in product["photos"]:
                # Extraemos el nombre del archivo de la URL
                filename = photo_url.split("/")[-1]
                file_path = os.path.join(UPLOAD_FOLDER, filename)
                
                if os.path.exists(file_path):
                    os.remove(file_path)

        # 2. Eliminar de la base de datos
        products.delete_one({"_id": ObjectId(id)})
        return jsonify({"message": "Product and images deleted"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# ============================
#   DETALLE POR ID (CON CONTADOR)
# ============================
@products_bp.route("/products/<id>", methods=["GET"])
def get_product(id):
    try:
        product = products.find_one({"_id": ObjectId(id)})
        if not product:
            return jsonify({"error": "Product not found"}), 404

        # Incrementar vistas
        products.update_one({"_id": ObjectId(id)}, {"$inc": {"views": 1}})
        
        product["_id"] = str(product["_id"])
        if "category_id" in product and isinstance(product["category_id"], ObjectId):
            product["category_id"] = str(product["category_id"])
        return jsonify(product), 200
    except:
        return jsonify({"error": "Invalid ID format"}), 400
    
# ============================
#   PRODUCTO MAS VISTO
# ============================    
@products_bp.route("/products/most-viewed", methods=["GET"])
def get_most_viewed_products():
    try:
        result = []
        for prod in products.find().sort("views", -1).limit(6):  # Mostrar los 6 más vistos
            prod["_id"] = str(prod["_id"])
            if "category_id" in prod and isinstance(prod["category_id"], ObjectId):
                prod["category_id"] = str(prod["category_id"])

            result.append(prod)

        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ============================
#   PRODUCTOS MÁS VENDIDOS
# ============================
@products_bp.route("/products/best-sellers", methods=["GET"])
def get_best_sellers():
    try:
        limit = int(request.args.get("limit", 4))
        result = []

        for prod in products.find().sort("purchases", -1).limit(limit):
            prod["_id"] = str(prod["_id"])
            if "category_id" in prod and isinstance(prod["category_id"], ObjectId):
                prod["category_id"] = str(prod["category_id"])
            

            result.append(prod)

        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400
