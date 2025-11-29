from flask import Blueprint, request, jsonify
from pymongo import MongoClient
from bson import ObjectId

carts_bp = Blueprint("carts", __name__)

client = MongoClient("mongodb://localhost:27017/")
db = client["joyeria_db"]
carts = db["carts"]

# Crear un carrito vacio
@carts_bp.route("/carts", methods=["POST"])
def create_cart():
    cart_id = carts.insert_one({
        "items": []   # lista vacia al inicio
    }).inserted_id

    return jsonify({"message": "Cart created", "id": str(cart_id)}), 201


# Agregar un producto al carrito
@carts_bp.route("/carts/<id>/add", methods=["POST"])
def add_to_cart(id):
    data = request.json

    product = {
        "product_id": data["product_id"],
        "name": data["name"],
        "price": data["price"],
        "quantity": data["quantity"]
    }

    carts.update_one(
        {"_id": ObjectId(id)},
        {"$push": {"items": product}}
    )

    return jsonify({"message": "Product added to cart"}), 200


# Obtener carrito
@carts_bp.route("/carts/<id>", methods=["GET"])
def get_cart(id):
    cart = carts.find_one({"_id": ObjectId(id)})
    if not cart:
        return jsonify({"error": "Cart not found"}), 404

    cart["_id"] = str(cart["_id"])
    return jsonify(cart), 200


# Vaciar carrito
@carts_bp.route("/carts/<id>/clear", methods=["PUT"])
def clear_cart(id):
    carts.update_one(
        {"_id": ObjectId(id)},
        {"$set": {"items": []}}
    )
    return jsonify({"message": "Cart cleared"}), 200
