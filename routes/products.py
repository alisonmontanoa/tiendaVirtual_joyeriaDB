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

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

# Colecciones
products = db.get_collection("products")
categories = db.get_collection("categories")

# ============================
# CREAR PRODUCTO
# ============================
@products_bp.route("/products", methods=["POST"])
def create_product():
    try:
        data = request.form

        char_raw = data.get("characteristics", "{}")
        try:
            characteristics_dict = json.loads(char_raw)
        except:
            characteristics_dict = {"detalle": char_raw}

        photos_list = []
        if "photos" in request.files:
            files = request.files.getlist("photos")
            for file in files:
                if file and allowed_file(file.filename):
                    filename = secure_filename(file.filename)
                    timestamp = int(datetime.now().timestamp())
                    new_filename = f"{timestamp}_{filename}"
                    file.save(os.path.join(UPLOAD_FOLDER, new_filename))
                    photos_list.append(f"/static/images/products/{new_filename}")

        new_product = {
            "name": data.get("name"),
            "description": data.get("description", ""),
            "price": float(data.get("price", 0)),
            "category_id": ObjectId(data.get("category_id")),
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
# OBTENER PRODUCTOS
# ============================
@products_bp.route("/products", methods=["GET"])
def get_products():
    try:
        category_id = request.args.get("category")
        query = {}

        if category_id:
            query["category_id"] = ObjectId(category_id)

        result = []
        for prod in products.find(query).sort("created_at", -1):
            prod["_id"] = str(prod["_id"])

            if isinstance(prod.get("category_id"), ObjectId):
                cat = categories.find_one({"_id": prod["category_id"]})
                prod["category_id"] = str(prod["category_id"])
                prod["category_name"] = cat["name"] if cat else "General"

            result.append(prod)

        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ============================
# DETALLE POR ID
# ============================
@products_bp.route("/products/<id>", methods=["GET"])
def get_product(id):
    try:
        product = products.find_one({"_id": ObjectId(id)})
        if not product:
            return jsonify({"error": "Product not found"}), 404

        products.update_one({"_id": ObjectId(id)}, {"$inc": {"views": 1}})

        product["_id"] = str(product["_id"])

        if isinstance(product.get("category_id"), ObjectId):
            cat = categories.find_one({"_id": product["category_id"]})
            product["category_id"] = str(product["category_id"])
            product["category_name"] = cat["name"] if cat else "General"

        return jsonify(product), 200
    except:
        return jsonify({"error": "Invalid ID"}), 400

# ============================
# ACTUALIZAR PRODUCTO
# ============================
@products_bp.route("/products/<id>", methods=["PUT"])
def update_product(id):
    try:
        product = products.find_one({"_id": ObjectId(id)})
        if not product:
            return jsonify({"error": "Product not found"}), 404

        data = request.form
        updated_photos = product.get("photos", [])

        if "photos" in request.files:
            updated_photos = []
            for file in request.files.getlist("photos"):
                if file and allowed_file(file.filename):
                    filename = secure_filename(file.filename)
                    timestamp = int(datetime.now().timestamp())
                    new_filename = f"{timestamp}_{filename}"
                    file.save(os.path.join(UPLOAD_FOLDER, new_filename))
                    updated_photos.append(f"/static/images/products/{new_filename}")

        char_raw = data.get("characteristics")
        cat_id = data.get("category_id")

        updated_fields = {
            "name": data.get("name", product["name"]),
            "description": data.get("description", product.get("description", "")),
            "price": float(data.get("price", product["price"])),
            "category_id": ObjectId(cat_id) if cat_id else product["category_id"],
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
# ELIMINAR PRODUCTO
# ============================
@products_bp.route("/products/<id>", methods=["DELETE"])
def delete_product(id):
    try:
        product = products.find_one({"_id": ObjectId(id)})
        if product and "photos" in product:
            for photo in product["photos"]:
                path = os.path.join(UPLOAD_FOLDER, photo.split("/")[-1])
                if os.path.exists(path):
                    os.remove(path)

        products.delete_one({"_id": ObjectId(id)})
        return jsonify({"message": "Product deleted"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 400

# ============================
# MÁS VISTOS
# ============================
@products_bp.route("/products/most-viewed", methods=["GET"])
def most_viewed():
    result = []
    for prod in products.find().sort("views", -1).limit(6):
        prod["_id"] = str(prod["_id"])

        if isinstance(prod.get("category_id"), ObjectId):
            cat = categories.find_one({"_id": prod["category_id"]})
            prod["category_id"] = str(prod["category_id"])
            prod["category_name"] = cat["name"] if cat else "General"

        result.append(prod)

    return jsonify(result), 200

# ============================
# MÁS VENDIDOS
# ============================
@products_bp.route("/products/best-sellers", methods=["GET"])
def best_sellers():
    limit = int(request.args.get("limit", 4))
    result = []

    for prod in products.find().sort("purchases", -1).limit(limit):
        prod["_id"] = str(prod["_id"])

        if isinstance(prod.get("category_id"), ObjectId):
            cat = categories.find_one({"_id": prod["category_id"]})
            prod["category_id"] = str(prod["category_id"])
            prod["category_name"] = cat["name"] if cat else "General"

        result.append(prod)

    return jsonify(result), 200
