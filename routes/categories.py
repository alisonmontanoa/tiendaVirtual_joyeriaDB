from flask import Blueprint, request, jsonify
from pymongo import MongoClient
from bson import ObjectId

categories_bp = Blueprint("categories", __name__)

client = MongoClient("mongodb://localhost:27017/")
db = client["joyeria_db"]
categories = db["categories"]

# Crear categoria
@categories_bp.route("/categories", methods=["POST"])
def create_category():
    data = request.json
    category_id = categories.insert_one({
        "name": data["name"],
        "description": data.get("description", "")
    }).inserted_id

    return jsonify({"message": "Category created", "id": str(category_id)}), 201


# Obtener todas las categorias
@categories_bp.route("/categories", methods=["GET"])
def get_categories():
    result = []
    for cat in categories.find():
        cat["_id"] = str(cat["_id"])
        result.append(cat)

    return jsonify(result), 200


# Obtener una categoria por id
@categories_bp.route("/categories/<id>", methods=["GET"])
def get_category(id):
    category = categories.find_one({"_id": ObjectId(id)})
    if not category:
        return jsonify({"error": "Category not found"}), 404

    category["_id"] = str(category["_id"])
    return jsonify(category), 200


# Actualizar categoria
@categories_bp.route("/categories/<id>", methods=["PUT"])
def update_category(id):
    data = request.json
    categories.update_one(
        {"_id": ObjectId(id)},
        {"$set": data}
    )
    return jsonify({"message": "Category updated"}), 200


# Eliminar categoria
@categories_bp.route("/categories/<id>", methods=["DELETE"])
def delete_category(id):
    categories.delete_one({"_id": ObjectId(id)})
    return jsonify({"message": "Category deleted"}), 200
