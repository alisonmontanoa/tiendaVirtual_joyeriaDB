from flask import Blueprint, request, jsonify
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime
from werkzeug.utils import secure_filename
import os

products_bp = Blueprint("products", __name__)

client = MongoClient("mongodb://localhost:27017/")
db = client["joyeria_db"]
products = db["products"]
categories = db["categories"]

UPLOAD_FOLDER = "static/images/"
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}

# Verifica imágenes válidas
def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


# ============================
#   CREAR PRODUCTO
# ============================
@products_bp.route("/products", methods=["POST"])
def create_product():
    data = request.form

    # Guardar fotos
    photos_list = []
    if "photos" in request.files:
        files = request.files.getlist("photos")

        for file in files:
            if allowed_file(file.filename):
                filename = secure_filename(file.filename)
                path = os.path.join(UPLOAD_FOLDER, filename)
                file.save(path)
                photos_list.append("/static/images/" + filename)

    product_id = products.insert_one({
        "name": data.get("name"),
        "description": data.get("description", ""),
        "price": float(data.get("price")),
        "category_id": str(data.get("category_id")),
        "type": data.get("type", "joya"),
        "photos": photos_list,
        "characteristics": {},
        "views": 0,
        "purchases": 0,
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }).inserted_id

    return jsonify({"message": "Product created", "id": str(product_id)}), 201


# ============================
#   OBTENER TODOS
# ============================
@products_bp.route("/products", methods=["GET"])
def get_products():
    result = []
    for prod in products.find():
        prod["_id"] = str(prod["_id"])
        result.append(prod)
    return jsonify(result), 200


# ============================
#   OBTENER POR CATEGORÍA
# ============================
@products_bp.route("/products/category/<id>", methods=["GET"])
def get_products_by_category(id):
    category = categories.find_one({"_id": ObjectId(id)})
    if not category:
        return jsonify({"error": "Category not found"}), 404

    result = []
    for prod in products.find({"category_id": id}):
        products.update_one({"_id": prod["_id"]}, {"$inc": {"views": 1}})
        prod["_id"] = str(prod["_id"])
        result.append(prod)

    return jsonify(result), 200


# ============================
#   ACTUALIZAR PRODUCTO
# ============================
@products_bp.route("/products/<id>", methods=["PUT"])
def update_product(id):

    product = products.find_one({"_id": ObjectId(id)})
    if not product:
        return jsonify({"error": "Product not found"}), 404

    data = request.form
    updated_photos = product.get("photos", [])

    # Si envía imágenes nuevas → reemplazamos
    if "photos" in request.files:
        new_photos = request.files.getlist("photos")
        updated_photos = []

        for file in new_photos:
            if allowed_file(file.filename):
                filename = secure_filename(file.filename)
                file.save(os.path.join(UPLOAD_FOLDER, filename))
                updated_photos.append("/static/images/" + filename)

    updated_fields = {
        "name": data.get("name", product["name"]),
        "description": data.get("description", product.get("description", "")),
        "price": float(data.get("price", product["price"])),
        "category_id": str(data.get("category_id", product["category_id"])),
        "type": data.get("type", product.get("type", "joya")),
        "photos": updated_photos,
        "updated_at": datetime.now()
    }

    products.update_one({"_id": ObjectId(id)}, {"$set": updated_fields})

    return jsonify({"message": "Product updated"}), 200


# ============================
#   ELIMINAR PRODUCTO
# ============================
@products_bp.route("/products/<id>", methods=["DELETE"])
def delete_product(id):
    products.delete_one({"_id": ObjectId(id)})
    return jsonify({"message": "Product deleted"}), 200


# ============================
#   DETALLE POR ID (CONTADOR)
# ============================
@products_bp.route("/products/<id>", methods=["GET"])
def get_product(id):
    product = products.find_one({"_id": ObjectId(id)})
    if not product:
        return jsonify({"error": "Product not found"}), 404

    products.update_one({"_id": ObjectId(id)}, {"$inc": {"views": 1}})
    product["_id"] = str(product["_id"])

    return jsonify(product), 200


# ============================
#   BÚSQUEDA
# ============================
@products_bp.route("/products/search", methods=["GET"])
def search_products():
    q = request.args.get("q", "")
    cat = request.args.get("category", "")

    filter_query = {}

    if q:
        filter_query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}}
        ]

    if cat:
        filter_query["category_id"] = cat

    result = []
    for p in products.find(filter_query):
        products.update_one({"_id": p["_id"]}, {"$inc": {"views": 1}})
        p["_id"] = str(p["_id"])
        result.append(p)

    return jsonify(result), 200


# ============================
#   TOP VIEWS & BEST SELLERS
# ============================
@products_bp.route("/products/most-viewed", methods=["GET"])
def get_most_viewed():
    result = []
    for p in products.find().sort("views", -1).limit(10):
        p["_id"] = str(p["_id"])
        result.append(p)
    return jsonify(result), 200


@products_bp.route("/products/best-sellers", methods=["GET"])
def get_best_sellers():
    result = []
    for p in products.find().sort("purchases", -1).limit(10):
        p["_id"] = str(p["_id"])
        result.append(p)
    return jsonify(result), 200