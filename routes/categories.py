from flask import Blueprint, request, jsonify
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime # MEJORA: Para registrar cuándo se crean/editan

categories_bp = Blueprint("categories", __name__)

# Configuración de base de datos
client = MongoClient("mongodb://localhost:27017/")
db = client["joyeria_db"]
categories_collection = db["categories"]
products_collection = db["products"] # MEJORA: Necesario para validar antes de eliminar

# ============================
#   CREAR CATEGORÍA (MEJORADO)
# ============================
@categories_bp.route("/categories", methods=["POST"])
def create_category():
    try:
        data = request.json
        name = data.get("name")
        
        if not name:
            return jsonify({"error": "El nombre de la categoría es obligatorio"}), 400

        # MEJORA: Evitar categorías duplicadas (ignora mayúsculas/minúsculas)
        exists = categories_collection.find_one({"name": {"$regex": f"^{name}$", "$options": "i"}})
        if exists:
            return jsonify({"error": f"La categoría '{name}' ya existe"}), 400

        new_category = {
            "name": name,
            "description": data.get("description", ""),
            "created_at": datetime.now(), # MEJORA: Auditoría de creación
            "updated_at": datetime.now()
        }

        result = categories_collection.insert_one(new_category)
        return jsonify({"message": "Categoría creada con éxito", "id": str(result.inserted_id)}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ============================
#   OBTENER TODAS (MEJORADO)
# ============================
@categories_bp.route("/categories", methods=["GET"])
def get_categories():
    result = []
    # MEJORA: Ordenar alfabéticamente para que se vea mejor en el Admin
    for cat in categories_collection.find().sort("name", 1):
        cat["_id"] = str(cat["_id"])
        result.append(cat)
    return jsonify(result), 200

# ============================
#   ACTUALIZAR CATEGORÍA
# ============================
@categories_bp.route("/categories/<id>", methods=["PUT"])
def update_category(id):
    try:
        data = request.json
        data["updated_at"] = datetime.now() # MEJORA: Registrar fecha de modificación
        
        result = categories_collection.update_one(
            {"_id": ObjectId(id)},
            {"$set": data}
        )
        
        if result.matched_count == 0:
            return jsonify({"error": "Categoría no encontrada"}), 404
            
        return jsonify({"message": "Categoría actualizada"}), 200
    except Exception as e:
        return jsonify({"error": "ID no válido o error de servidor"}), 400

# ============================
#   ELIMINAR CATEGORÍA (SEGURIDAD)
# ============================
@categories_bp.route("/categories/<id>", methods=["DELETE"])
def delete_category(id):
    try:
        # MEJORA CRÍTICA: Impedir borrar categorías que tengan productos asignados.
        # Esto evita que tu tienda intente mostrar un producto con una categoría inexistente.
        product_count = products_collection.count_documents({"category_id": id})
        if product_count > 0:
            return jsonify({
                "error": f"No se puede eliminar: hay {product_count} productos asociados a esta categoría."
            }), 400

        result = categories_collection.delete_one({"_id": ObjectId(id)})
        if result.deleted_count == 0:
            return jsonify({"error": "Categoría no encontrada"}), 404

        return jsonify({"message": "Categoría eliminada con éxito"}), 200
    except Exception as e:
        return jsonify({"error": "ID de categoría no válido"}), 400