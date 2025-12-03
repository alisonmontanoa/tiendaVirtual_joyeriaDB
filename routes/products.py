from flask import Blueprint, request, jsonify
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime

products_bp = Blueprint("products", __name__)

client = MongoClient("mongodb://localhost:27017/")
db = client["joyeria_db"]
products = db["products"]
categories = db["categories"]
orders = db["orders"]

# Crear producto
@products_bp.route("/products", methods=["POST"])
def create_product():
    data = request.json

    product_id = products.insert_one({
        "name": data["name"],
        "description": data.get("description", ""),
        "price": float(data["price"]),
        "category_id": data["category_id"] or data.get("category"),
        "photos": data.get("photos", []),  # Multiples fotos
        "characteristics": data.get("characteristics", {}),  # Caracteristicas adicionales
        "views": 0,
        "purchases": 0,  # Contador de compras
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }).inserted_id

    return jsonify({"message": "Product created", "id": str(product_id)}), 201

# Obtener todos los productos
@products_bp.route("/products", methods=["GET"])
def get_products():
    result = []
    for prod in products.find():
        prod["_id"] = str(prod["_id"])
        result.append(prod)

    return jsonify(result), 200

# Obtener productos por categoria
@products_bp.route("/products/category/<id>", methods=["GET"])
def get_products_by_category(id):
    result = []
    for prod in products.find({"category_id": id}):
        # Incrementar vistas cuando se muestra por categoria
        products.update_one(
            {"_id": prod["_id"]},
            {"$inc": {"views": 1}}
        )
        
        prod["_id"] = str(prod["_id"])
        result.append(prod)

    return jsonify(result), 200

# Actualizar producto
@products_bp.route("/products/<id>", methods=["PUT"])
def update_product(id):
    data = request.json
    data["updated_at"] = datetime.now()
    
    products.update_one(
        {"_id": ObjectId(id)},
        {"$set": data}
    )
    return jsonify({"message": "Product updated"}), 200


# Eliminar producto
@products_bp.route("/products/<id>", methods=["DELETE"])
def delete_product(id):
    products.delete_one({"_id": ObjectId(id)})
    return jsonify({"message": "Product deleted"}), 200

# Obtener producto por ID con incremento de vistas
@products_bp.route("/products/<id>", methods=["GET"])
def get_product(id):
    product = products.find_one({"_id": ObjectId(id)})
    if not product:
        return jsonify({"error": "Product not found"}), 404

    # Incrementar vistas cuando se ve el detalle
    products.update_one(
        {"_id": ObjectId(id)},
        {"$inc": {"views": 1}}
    )

    product["_id"] = str(product["_id"])
    return jsonify(product), 200

# BUSQUEDA DE PRODUCTOS 
@products_bp.route("/products/search", methods=["GET"])
def search_products():
    query = request.args.get("q", "")
    category = request.args.get("category", "")
    
    search_filter = {}
    
    if query:
        search_filter["$or"] = [
            {"name": {"$regex": query, "$options": "i"}},
            {"description": {"$regex": query, "$options": "i"}}
        ]
    
    if category:
        search_filter["category_id"] = category
    
    result = []
    for product in products.find(search_filter):
        # Incrementar vistas cuando se busca
        products.update_one(
            {"_id": product["_id"]},
            {"$inc": {"views": 1}}
        )
        
        product["_id"] = str(product["_id"])
        result.append(product)
    
    return jsonify(result), 200

# PRODUCTOS MAS VISTOS
@products_bp.route("/products/most-viewed", methods=["GET"])
def get_most_viewed():
    limit = int(request.args.get("limit", 10))
    
    result = []
    for product in products.find().sort("views", -1).limit(limit):
        product["_id"] = str(product["_id"])
        result.append(product)
    
    return jsonify(result), 200

# PRODUCTOS MAS VENDIDOS
@products_bp.route("/products/best-sellers", methods=["GET"])
def get_best_sellers():
    limit = int(request.args.get("limit", 10))
    
    result = []
    for product in products.find().sort("purchases", -1).limit(limit):
        product["_id"] = str(product["_id"])
        result.append(product)
    
    return jsonify(result), 200

# ANALYTICS
@products_bp.route("/products/analytics", methods=["GET"])
def get_product_analytics():
    # Productos mas vistos vs mas comprados
    most_viewed = list(products.find().sort("views", -1).limit(5))
    best_sellers = list(products.find().sort("purchases", -1).limit(5))
    
    # Estadisticas generales
    total_products = products.count_documents({})
    total_views = products.aggregate([{"$group": {"_id": None, "total": {"$sum": "$views"}}}]).next().get("total", 0)
    total_purchases = products.aggregate([{"$group": {"_id": None, "total": {"$sum": "$purchases"}}}]).next().get("total", 0)
    
    # Convertir ObjectId a string
    for product in most_viewed:
        product["_id"] = str(product["_id"])
    
    for product in best_sellers:
        product["_id"] = str(product["_id"])
    
    return jsonify({
        "stats": {
            "total_products": total_products,
            "total_views": total_views,
            "total_purchases": total_purchases
        },
        "most_viewed": most_viewed,
        "best_sellers": best_sellers
    }), 200

# INCREMENTAR VISTAS
@products_bp.route("/products/<id>/view", methods=["POST"])
def increment_views(id):
    result = products.update_one(
        {"_id": ObjectId(id)},
        {"$inc": {"views": 1}}
    )
    
    if result.modified_count:
        return jsonify({"message": "View counted"}), 200
    else:
        return jsonify({"error": "Product not found"}), 404
