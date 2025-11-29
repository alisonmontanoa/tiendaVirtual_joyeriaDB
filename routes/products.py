from flask import Blueprint, request, jsonify
from pymongo import MongoClient
from bson import ObjectId

products_bp = Blueprint("products", "products")

client = MongoClient("mongodb://localhost:27017/")
db = client["joyeria_db"]
products = db["products"]

# Crear producto
@products_bp.route("/products", methods=["POST"])
def create_product():
    data = request.json

    product_id = products.insert_one({
        "name": data["name"],
        "description": data.get("description", ""),
        "price": data["price"],
        "category_id": data["category_id"],   # ObjectId en string
        "photo": data.get("photo", ""),
        "views": 0
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
        prod["_id"] = str(prod["_id"])
        result.append(prod)

    return jsonify(result), 200


# Actualizar producto
@products_bp.route("/products/<id>", methods=["PUT"])
def update_product(id):
    data = request.json
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
