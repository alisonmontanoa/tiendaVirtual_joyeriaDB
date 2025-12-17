from flask import Blueprint, request, jsonify
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime
from werkzeug.utils import secure_filename
import os
import json

products_bp = Blueprint("products", __name__)

# Configuración de base de datos
client = MongoClient("mongodb://localhost:27017/")
db = client["joyeria_db"]
products = db["products"]
categories = db["categories"]

# ==========================================
# CONFIGURACIÓN DE CARPETA DE IMÁGENES
# ==========================================
# Detecta la ruta base del proyecto de forma automática (funciona en Windows/Mac/Linux)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'static', 'images', 'products')

# CORRECCIÓN: Agregamos 'avif' y 'webp' a la lista de permitidos
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp", "avif"}

# Crear la carpeta automáticamente si no existe
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

# ============================
#   CREAR PRODUCTO (POST)
# ============================
@products_bp.route("/products", methods=["POST"])
def create_product():
    try:
        data = request.form
        
        # MEJORA: Procesamiento flexible de características (JSON o Texto)
        char_raw = data.get("characteristics", "{}")
        try:
            # Si el usuario envió un JSON válido, lo convertimos a diccionario
            characteristics_dict = json.loads(char_raw)
        except:
            # Si envió texto normal, lo guardamos como un detalle simple
            characteristics_dict = {"detalle": char_raw}

        # Procesar Imágenes
        photos_list = []
        if "photos" in request.files:
            files = request.files.getlist("photos")
            for file in files:
                # Verificamos si el archivo tiene nombre y extensión permitida (AVIF incluido)
                if file and allowed_file(file.filename):
                    filename = secure_filename(file.filename)
                    
                    # Usamos timestamp para evitar nombres duplicados
                    timestamp = int(datetime.now().timestamp())
                    new_filename = f"{timestamp}_{filename}"
                    
                    # 1. Guardar físicamente en el disco
                    save_path = os.path.join(UPLOAD_FOLDER, new_filename)
                    file.save(save_path)
                    
                    # 2. Guardar URL para la web (OJO: Siempre usa / para rutas web)
                    web_url = f"/static/images/products/{new_filename}"
                    photos_list.append(web_url)

        new_product = {
            "name": data.get("name"),
            "description": data.get("description", ""),
            "price": float(data.get("price", 0)),
            "category_id": data.get("category_id"),
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
        result = []
        # Ordenamos por los más recientes creados
        for prod in products.find().sort("created_at", -1):
            prod["_id"] = str(prod["_id"])
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
            updated_photos = [] 
            for file in new_photos:
                if file and allowed_file(file.filename):
                    filename = secure_filename(file.filename)
                    file.save(os.path.join(UPLOAD_FOLDER, filename))
                    updated_photos.append(f"/static/images/products/{filename}")

        char_raw = data.get("characteristics")
        
        updated_fields = {
            "name": data.get("name", product["name"]),
            "description": data.get("description", product.get("description", "")),
            "price": float(data.get("price", product["price"])),
            "category_id": data.get("category_id", product.get("category_id")),
            "type": data.get("type", product.get("type", "joya")),
            "photos": updated_photos,
            "updated_at": datetime.now()
        }
        
        # Procesamiento seguro de características en actualización
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
#   ELIMINAR PRODUCTO (CON LIMPIEZA)
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
        return jsonify(product), 200
    except:
        return jsonify({"error": "Invalid ID format"}), 400